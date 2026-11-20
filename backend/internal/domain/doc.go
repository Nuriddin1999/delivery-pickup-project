// Package domain is the heart of the service: couriers, orders, the rules
// for who may take what, and routes. It has no I/O, no JSON and no locking,
// so every rule can be read and tested on its own. Outer layers depend on
// this package; it depends on nothing in the project.
package domain
