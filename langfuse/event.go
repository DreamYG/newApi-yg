package langfuse

import "time"

// IngestionRequest is the top-level batch payload sent to POST /api/public/ingestion.
type IngestionRequest struct {
	Batch []IngestionEvent `json:"batch"`
}

// IngestionEvent is a single event in the batch, discriminated by Type.
type IngestionEvent struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Timestamp time.Time `json:"timestamp"`
	Body      any       `json:"body"`
}

// TraceBody is the body for a "trace-create" event.
type TraceBody struct {
	ID       string            `json:"id"`
	Name     string            `json:"name,omitempty"`
	UserID   string            `json:"userId,omitempty"`
	Input    any               `json:"input,omitempty"`
	Output   any               `json:"output,omitempty"`
	Tags     []string          `json:"tags,omitempty"`
	Metadata map[string]any    `json:"metadata,omitempty"`
}

// GenerationBody is the body for a "generation-create" event.
type GenerationBody struct {
	ID                  string         `json:"id"`
	TraceID             string         `json:"traceId,omitempty"`
	Name                string         `json:"name,omitempty"`
	Model               string         `json:"model,omitempty"`
	Input               any            `json:"input,omitempty"`
	Output              any            `json:"output,omitempty"`
	Usage               *UsageData     `json:"usage,omitempty"`
	StartTime           *time.Time     `json:"startTime,omitempty"`
	EndTime             *time.Time     `json:"endTime,omitempty"`
	CompletionStartTime *time.Time     `json:"completionStartTime,omitempty"`
	Metadata            map[string]any `json:"metadata,omitempty"`
}

// UsageData holds token usage info for a generation.
type UsageData struct {
	Input  int    `json:"input"`
	Output int    `json:"output"`
	Total  int    `json:"total"`
	Unit   string `json:"unit"`
}

// IngestionResponse is the response from the ingestion endpoint (207 Multi-Status).
type IngestionResponse struct {
	Successes []IngestionResult `json:"successes"`
	Errors    []IngestionResult `json:"errors"`
}

// IngestionResult represents a single event result.
type IngestionResult struct {
	ID      string `json:"id"`
	Status  int    `json:"status"`
	Message string `json:"message,omitempty"`
}

// --- Langfuse ChatML 结构化消息类型 ---

// ChatMLThinkingPart 对应 Langfuse ThinkingContentPartSchema，用于表示模型的推理/思考片段。
// 参考：packages/shared/src/utils/IORepresentation/chatML/types.ts
type ChatMLThinkingPart struct {
	Type    string `json:"type"`              // 固定值 "thinking"
	Content string `json:"content"`           // 思考文本
	Summary string `json:"summary,omitempty"` // 可选摘要（OpenAI Responses API）
}

// ChatMLAssistantMessage 是发送给 Langfuse generation output 的结构化助手消息。
// 当模型产生思考内容时，将正式回答放在 Content，思考链放在 Thinking 数组中，
// Langfuse 前端会将两者分开渲染。
type ChatMLAssistantMessage struct {
	Role     string               `json:"role"`               // 固定值 "assistant"
	Content  string               `json:"content"`            // 正式回答文本
	Thinking []ChatMLThinkingPart `json:"thinking,omitempty"` // 思考内容，无则省略
}
