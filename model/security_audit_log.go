package model

import (
	"time"
)

// SecurityAuditLog 安全审计日志，记录每次危险关键词/敏感词触发事件。
type SecurityAuditLog struct {
	Id             int       `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId         int       `json:"user_id" gorm:"index"`
	Username       string    `json:"username" gorm:"type:varchar(100)"`
	KeywordId      int       `json:"keyword_id"`
	TriggerKeyword string    `json:"trigger_keyword" gorm:"type:varchar(500)"`
	EventType      string    `json:"event_type" gorm:"type:varchar(50)"`
	Action         string    `json:"action" gorm:"type:varchar(50)"`
	RequestSummary string    `json:"request_summary" gorm:"type:text"`
	ModelName      string    `json:"model_name" gorm:"type:varchar(100)"`
	IpAddress      string    `json:"ip_address" gorm:"type:varchar(50)"`
	NotifiedAdmin  bool      `json:"notified_admin"`
	CreatedAt      time.Time `json:"created_at" gorm:"index"`
}

func (SecurityAuditLog) TableName() string {
	return "security_audit_logs"
}

// GetSecurityAuditLogs 分页查询审计日志，支持按事件类型、用户名、时间范围过滤。
func GetSecurityAuditLogs(params SecurityAuditLogQuery) (logs []SecurityAuditLog, total int64, err error) {
	tx := DB.Model(&SecurityAuditLog{})
	if params.EventType != "" {
		tx = tx.Where("event_type = ?", params.EventType)
	}
	if params.Username != "" {
		tx = tx.Where("username LIKE ?", "%"+params.Username+"%")
	}
	if params.Action != "" {
		tx = tx.Where("action = ?", params.Action)
	}
	if !params.StartTime.IsZero() {
		tx = tx.Where("created_at >= ?", params.StartTime)
	}
	if !params.EndTime.IsZero() {
		tx = tx.Where("created_at <= ?", params.EndTime)
	}
	err = tx.Count(&total).Error
	if err != nil {
		return
	}
	err = tx.Order("id DESC").Offset((params.Page - 1) * params.PageSize).Limit(params.PageSize).Find(&logs).Error
	return
}

// SecurityAuditLogQuery 审计日志查询参数。
type SecurityAuditLogQuery struct {
	EventType string
	Username  string
	Action    string
	StartTime time.Time
	EndTime   time.Time
	Page      int
	PageSize  int
}

// CreateSecurityAuditLog 创建审计日志记录。
func CreateSecurityAuditLog(log *SecurityAuditLog) error {
	return DB.Create(log).Error
}

// ClearSecurityAuditLogs 清理指定天数之前的审计日志。
func ClearSecurityAuditLogs(retentionDays int) (int64, error) {
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	result := DB.Where("created_at < ?", cutoff).Delete(&SecurityAuditLog{})
	return result.RowsAffected, result.Error
}
