package service

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
)

var (
	securityKeywordsCache   atomic.Value // []model.SecurityKeyword
	securityCacheExpireAt   atomic.Int64
	securityCacheMu         sync.Mutex
	securityCacheTTLSeconds int64 = 30

	// regexpCache 缓存已编译的正则表达式，避免每次请求重复编译，key 为正则字符串。
	regexpCache sync.Map // map[string]*regexp.Regexp
)

// loadSecurityKeywords 从数据库加载启用的关键词，带本地缓存避免频繁查库。
func loadSecurityKeywords() []model.SecurityKeyword {
	now := time.Now().Unix()
	if cached := securityKeywordsCache.Load(); cached != nil {
		if now < securityCacheExpireAt.Load() {
			return cached.([]model.SecurityKeyword)
		}
	}
	securityCacheMu.Lock()
	defer securityCacheMu.Unlock()
	if now < securityCacheExpireAt.Load() {
		if cached := securityKeywordsCache.Load(); cached != nil {
			return cached.([]model.SecurityKeyword)
		}
	}
	keywords, err := model.GetAllEnabledSecurityKeywords()
	if err != nil {
		if common.DebugEnabled {
			common.SysLog("Security: failed to load keywords from DB: " + err.Error())
		}
		return nil
	}
	securityKeywordsCache.Store(keywords)
	securityCacheExpireAt.Store(now + securityCacheTTLSeconds)
	if common.DebugEnabled {
		common.SysLog(fmt.Sprintf("Security: loaded %d enabled keywords from DB", len(keywords)))
	}
	return keywords
}

// InvalidateSecurityKeywordsCache 在关键词 CRUD 操作后调用，强制下次请求重新加载，
// 同时清除正则缓存（关键词可能已修改）。
func InvalidateSecurityKeywordsCache() {
	securityCacheExpireAt.Store(0)
	regexpCache.Range(func(key, _ any) bool {
		regexpCache.Delete(key)
		return true
	})
}

// getOrCompileRegexp 返回缓存的已编译正则，不存在则编译并缓存。
// 编译失败返回 nil，调用方应跳过该关键词。
func getOrCompileRegexp(pattern string) *regexp.Regexp {
	if v, ok := regexpCache.Load(pattern); ok {
		return v.(*regexp.Regexp)
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		if common.DebugEnabled {
			common.SysLog("Security: invalid regex pattern: " + pattern + " err=" + err.Error())
		}
		return nil
	}
	actual, _ := regexpCache.LoadOrStore(pattern, re)
	return actual.(*regexp.Regexp)
}

// SecurityCheckResult 安全检测结果。
type SecurityCheckResult struct {
	Hit         bool
	Keyword     model.SecurityKeyword
	Matched     string // 实际匹配到的文本片段
	UserMessage string // 触发时的完整用户消息，用于审计日志摘要
}

// ExtractLastUserText 从 messages 中提取最后一条 role=user 的消息文本内容。
func ExtractLastUserText(messages []dto.Message) string {
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			return messages[i].StringContent()
		}
	}
	return ""
}

// HandleSecurityHit 在检测命中后异步写入审计日志并更新触发计数。
func HandleSecurityHit(userId int, username string, result *SecurityCheckResult, modelName, ip string) {
	actionStr := "request_blocked"
	if result.Keyword.Action == "ban_user" {
		actionStr = "user_banned"
	}

	// 优先使用完整用户消息作为摘要，其次降级为匹配片段
	summary := result.UserMessage
	if summary == "" {
		summary = result.Matched
	}
	if len(summary) > 200 {
		summary = summary[:200]
	}
	log := &model.SecurityAuditLog{
		UserId:         userId,
		Username:       username,
		KeywordId:      result.Keyword.Id,
		TriggerKeyword: result.Keyword.Keyword,
		EventType:      "dangerous_keyword",
		Action:         actionStr,
		RequestSummary: summary,
		ModelName:      modelName,
		IpAddress:      ip,
	}
	if err := model.CreateSecurityAuditLog(log); err != nil && common.DebugEnabled {
		common.SysLog("Security: failed to create audit log: " + err.Error())
	}

	// 更新触发计数
	model.DB.Exec("UPDATE security_keywords SET trigger_count = trigger_count + 1 WHERE id = ?", result.Keyword.Id)
}

// HandleSensitiveWordHit 在现有屏蔽词检测命中后异步写入审计日志，统一安全事件追踪。
func HandleSensitiveWordHit(userId int, username string, words []string, modelName, ip string) {
	triggerKeyword := strings.Join(words, ", ")
	summary := triggerKeyword
	if len(summary) > 200 {
		summary = summary[:200]
	}
	log := &model.SecurityAuditLog{
		UserId:         userId,
		Username:       username,
		TriggerKeyword: triggerKeyword,
		EventType:      "sensitive_word",
		Action:         "request_blocked",
		RequestSummary: summary,
		ModelName:      modelName,
		IpAddress:      ip,
	}
	if err := model.CreateSecurityAuditLog(log); err != nil && common.DebugEnabled {
		common.SysLog("Security: failed to create sensitive word audit log: " + err.Error())
	}
	if common.DebugEnabled {
		common.SysLog(fmt.Sprintf("Security: sensitive word audit logged, user=%s, words=%s", username, triggerKeyword))
	}
}

// BanUserForSecurity 因安全关键词命中而禁用用户，同步清除 Redis 缓存确保立即生效。
func BanUserForSecurity(userId int, username string) {
	err := model.DB.Model(&model.User{}).Where("id = ?", userId).Update("status", common.UserStatusDisabled).Error
	if err != nil {
		common.SysError("Security: failed to ban user " + username + ": " + err.Error())
		return
	}
	common.SysLog("Security: user banned due to dangerous keyword, userId=" + common.Interface2String(userId) + ", username=" + username)

	// 清除 Redis 用户缓存（key 格式与 model/user_cache.go 保持一致），确保后续请求立即被拒绝
	cacheKey := fmt.Sprintf("user:%d", userId)
	_ = common.RedisDel(cacheKey)
}

// CheckSecurityText 供 relay 层调用的检测入口。
// 根据关键词的 check_scope 配置，对全量文本或仅最后一条 user 消息执行检测。
// 正则表达式使用全局缓存，只在首次使用时编译，之后复用已编译对象。
func CheckSecurityText(fullText string, messages []dto.Message) *SecurityCheckResult {
	keywords := loadSecurityKeywords()
	if len(keywords) == 0 {
		return nil
	}

	// 始终提取最后一条 user 消息，既用于 user_only 匹配，也用于审计日志摘要
	lastUserText := ExtractLastUserText(messages)

	hasAll := false
	for _, kw := range keywords {
		if kw.CheckScope == "all" {
			hasAll = true
			break
		}
	}

	// 按 check_scope 分组匹配
	lowerFull := strings.ToLower(fullText)
	var lowerUser string
	if lastUserText != "" {
		lowerUser = strings.ToLower(lastUserText)
	}

	// exact 关键词分两组，用 Aho-Corasick 批量匹配
	var exactAll, exactUser []string
	exactMapAll := make(map[string]*model.SecurityKeyword)
	exactMapUser := make(map[string]*model.SecurityKeyword)
	for i := range keywords {
		kw := &keywords[i]
		if kw.MatchType == "regex" {
			continue
		}
		lower := strings.ToLower(kw.Keyword)
		if kw.CheckScope == "all" {
			exactAll = append(exactAll, lower)
			exactMapAll[lower] = kw
		} else {
			exactUser = append(exactUser, lower)
			exactMapUser[lower] = kw
		}
	}

	// 优先匹配 user_only 组（性能更优，覆盖大多数场景）
	if len(exactUser) > 0 && lowerUser != "" {
		if hit, matched := AcSearch(lowerUser, exactUser, true); hit && len(matched) > 0 {
			if kw, ok := exactMapUser[strings.ToLower(matched[0])]; ok {
				return &SecurityCheckResult{Hit: true, Keyword: *kw, Matched: matched[0], UserMessage: lastUserText}
			}
		}
	}

	// 再匹配 all 组
	if len(exactAll) > 0 && hasAll {
		if hit, matched := AcSearch(lowerFull, exactAll, true); hit && len(matched) > 0 {
			if kw, ok := exactMapAll[strings.ToLower(matched[0])]; ok {
				return &SecurityCheckResult{Hit: true, Keyword: *kw, Matched: matched[0], UserMessage: lastUserText}
			}
		}
	}

	// regex 关键词逐条匹配（使用缓存的已编译正则，避免重复编译）
	for i := range keywords {
		kw := &keywords[i]
		if kw.MatchType != "regex" {
			continue
		}
		re := getOrCompileRegexp(kw.Keyword)
		if re == nil {
			continue
		}
		var checkText string
		if kw.CheckScope == "all" {
			checkText = fullText
		} else {
			checkText = lastUserText
		}
		if checkText == "" {
			continue
		}
		if loc := re.FindString(checkText); loc != "" {
			return &SecurityCheckResult{Hit: true, Keyword: *kw, Matched: loc, UserMessage: lastUserText}
		}
	}

	return nil
}
