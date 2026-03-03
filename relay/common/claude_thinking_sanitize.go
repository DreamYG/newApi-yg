package common

import (
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

// SanitizeClaudeThinkingParams enforces Claude API constraints on the
// serialized JSON body when thinking (extended thinking / adaptive mode)
// is active. It must be called AFTER any param_override step so that admin
// overrides cannot accidentally inject invalid values.
//
// Constraints (from Claude docs):
//   - top_p   must be >= 0.95 or absent  (otherwise 400)
//   - top_k   must be absent              (otherwise 400)
//   - temperature must be 1.0 or absent   (otherwise 400)
//
// If the body does not have thinking enabled this function is a no-op.
func SanitizeClaudeThinkingParams(jsonData []byte) ([]byte, error) {
	thinking := gjson.GetBytes(jsonData, "thinking")
	if !thinking.Exists() {
		return jsonData, nil
	}
	thinkingType := gjson.GetBytes(jsonData, "thinking.type").String()
	if thinkingType == "" || thinkingType == "disabled" {
		return jsonData, nil
	}

	var err error

	// top_k must be absent
	if gjson.GetBytes(jsonData, "top_k").Exists() {
		jsonData, err = sjson.DeleteBytes(jsonData, "top_k")
		if err != nil {
			return jsonData, err
		}
	}

	// top_p must be >= 0.95 or absent
	if topP := gjson.GetBytes(jsonData, "top_p"); topP.Exists() {
		if topP.Float() < 0.95 {
			jsonData, err = sjson.DeleteBytes(jsonData, "top_p")
			if err != nil {
				return jsonData, err
			}
		}
	}

	// temperature must be 1.0 or absent
	if temp := gjson.GetBytes(jsonData, "temperature"); temp.Exists() {
		if temp.Float() != 1.0 {
			jsonData, err = sjson.SetBytes(jsonData, "temperature", 1.0)
			if err != nil {
				return jsonData, err
			}
		}
	}

	return jsonData, nil
}
