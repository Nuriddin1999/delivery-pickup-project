package domain

import (
	"fmt"
	"sort"
	"strings"
)

// Refusal codes. The page shows the message; the code is for tests and clients.
const (
	CodeNotFound        = "not_found"
	CodeOrderBroken     = "order_broken"
	CodeAlreadyAssigned = "already_assigned"
	CodeNotAssigned     = "not_assigned"
	CodeInactive        = "courier_inactive"
	CodeWrongKind       = "wrong_kind"
	CodeWrongRegion     = "wrong_region"
	CodeParcelLimit     = "parcel_limit"
	CodeWeightLimit     = "weight_limit"
)

// Refusal is a rule a request broke, with a sentence for the dispatcher.
type Refusal struct {
	Code    string
	Message string
}

func (r *Refusal) Error() string { return r.Message }

// Refuse builds a Refusal with a formatted message.
func Refuse(code, format string, args ...any) *Refusal {
	return &Refusal{Code: code, Message: fmt.Sprintf(format, args...)}
}

// NotFound is the refusal for an unknown order or courier.
func NotFound(what, id string) *Refusal {
	return Refuse(CodeNotFound, "There is no %s %q", what, id)
}

// IsCapacity reports whether the refusal is about a full courier.
func (r *Refusal) IsCapacity() bool {
	return r.Code == CodeParcelLimit || r.Code == CodeWeightLimit
}

// ValidationError lists problems per field, e.g. {"name": "Name is required"}.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string {
	keys := make([]string, 0, len(e.Fields))
	for k := range e.Fields {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	msgs := make([]string, len(keys))
	for i, k := range keys {
		msgs[i] = e.Fields[k]
	}
	return strings.Join(msgs, "; ")
}

// FieldError is a ValidationError for a single field.
func FieldError(field, message string) *ValidationError {
	return &ValidationError{Fields: map[string]string{field: message}}
}
