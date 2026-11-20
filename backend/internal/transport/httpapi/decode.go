package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const maxBodyBytes = 64 << 10

// decodeJSON reads a JSON body strictly. When the body is not usable it
// answers 400 with a readable message and returns false.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	err := dec.Decode(dst)
	if err == nil && dec.More() {
		err = errors.New("body must hold a single JSON object")
	}
	if err == nil {
		return true
	}
	msg, field := describeDecodeError(err)
	res := errorResponse{Code: "bad_request", Error: msg}
	if field != "" {
		res.Fields = map[string]string{field: msg}
	}
	writeJSON(w, http.StatusBadRequest, res)
	return false
}

// describeDecodeError turns a decoding error into a sentence, and names the
// field it is about when there is one.
func describeDecodeError(err error) (msg, field string) {
	var typeErr *json.UnmarshalTypeError
	var syntaxErr *json.SyntaxError
	var tooBig *http.MaxBytesError
	switch {
	case errors.Is(err, io.EOF):
		return "The request body is empty; send a JSON object", ""
	case errors.As(err, &syntaxErr):
		return "The request body is not valid JSON", ""
	case errors.As(err, &tooBig):
		return "The request body is too large", ""
	case errors.As(err, &typeErr):
		msg := fmt.Sprintf("%s has the wrong type: %s", typeErr.Field, expectedType(typeErr.Type.String()))
		return msg, strings.Split(typeErr.Field, ".")[0]
	case strings.HasPrefix(err.Error(), "json: unknown field"):
		return "Unknown field " + strings.TrimPrefix(err.Error(), "json: unknown field "), ""
	}
	return "Could not read the request: " + err.Error(), ""
}

func expectedType(goType string) string {
	switch strings.TrimPrefix(goType, "*") {
	case "int":
		return "expected a whole number"
	case "float64":
		return "expected a number"
	case "string":
		return "expected text"
	case "bool":
		return "expected true or false"
	case "[]string":
		return "expected a list of text"
	}
	return "expected " + goType
}
