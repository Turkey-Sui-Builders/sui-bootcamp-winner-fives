# Module std::option

URL: https://docs.sui.io/references/framework/sui_std/option

This module defines the Option type and its methods to represent and handle an optional value.

- Struct Option
- Constants
- Function none
- Function some
- Function is_none
- Function is_some
- Function contains
- Function borrow
- Function borrow_with_default
- Function get_with_default
- Function fill
- Function extract
- Function borrow_mut
- Function swap
- Function swap_or_fill
- Function destroy_with_default
- Function destroy_some
- Function destroy_none
- Function to_vec
- Macro function destroy
- Macro function do
- Macro function do_ref
- Macro function do_mut
- Macro function or
- Macro function and
- Macro function and_ref
- Macro function map
- Macro function map_ref
- Macro function filter
- Macro function is_some_and
- Macro function extract_or
- Macro function destroy_or

```
use std::vector;
```

## Struct `Option`

Abstraction of a value that may or may not be present. Implemented with a vector of size zero or one because Move bytecode does not have ADTs.

```
public struct Option<Element> has copy, drop, store
```

Click to open Fields
```
vec: vector<Element>
```

## Constants

The
```
Option
```

is in an invalid state for the operation attempted. The
```
Option
```

is `Some` while it should be `None` .

```
const EOPTION_IS_SET: u64 = 262144;
```

The
```
Option
```

is in an invalid state for the operation attempted. The
```
Option
```

is `None` while it should be `Some` .

```
const EOPTION_NOT_SET: u64 = 262145;
```

## Function `none`

Return an empty
```
Option
```

```
public fun none<Element>(): std::option::Option<Element>
```

Click to open Implementation
```
public fun none<Element>(): Option<Element> {
    Option { vec: vector::empty() }
}
```

## Function `some`

Return an
```
Option
```

containing `e`

```
public fun some<Element>(e: Element): std::option::Option<Element>
```

Click to open Implementation
```
public fun some<Element>(e: Element): Option<Element> {
    Option { vec: vector::singleton(e) }
}
```

## Function `is_none`

Return true if `t` does not hold a value

```
public fun is_none<Element>(t: &std::option::Option<Element>): bool
```

Click to open Implementation
```
public fun is_none<Element>(t: &Option<Element>): bool {
    t.vec.is_empty()
}
```

## Function `is_some`

Return true if `t` holds a value

```
public fun is_some<Element>(t: &std::option::Option<Element>): bool
```

Click to open Implementation
```
public fun is_some<Element>(t: &Option<Element>): bool {
    !t.vec.is_empty()
}
```

## Function `contains`

Return true if the value in `t` is equal to `e_ref` Always returns
```
false
```

if `t` does not hold a value

```
public fun contains<Element>(t: &std::option::Option<Element>, e_ref: &Element): bool
```

Click to open Implementation
```
public fun contains<Element>(t: &Option<Element>, e_ref: &Element): bool {
    t.vec.contains(e_ref)
}
```

## Function `borrow`

Return an immutable reference to the value inside `t` Aborts if `t` does not hold a value

```
public fun borrow<Element>(t: &std::option::Option<Element>): &Element
```

Click to open Implementation
```
public fun borrow<Element>(t: &Option<Element>): &Element {
    assert!(t.is_some(), EOPTION_NOT_SET);
    &t.vec[0]
}
```

## Function `borrow_with_default`

Return a reference to the value inside `t` if it holds one Return `default_ref` if `t` does not hold a value

```
public fun borrow_with_default<Element>(t: &std::option::Option<Element>, default_ref: &Element): &Element
```

Click to open Implementation
```
public fun borrow_with_default<Element>(t: &Option<Element>, default_ref: &Element): &Element {
    let vec_ref = &t.vec;
    if (vec_ref.is_empty()) default_ref else &vec_ref[0]
}
```

## Function `get_with_default`

Return the value inside `t` if it holds one Return `default` if `t` does not hold a value

```
public fun get_with_default<Element: copy, drop>(t: &std::option::Option<Element>, default: Element): Element
```

Click to open Implementation
```
public fun get_with_default<Element: copy + drop>(t: &Option<Element>, default: Element): Element {
    let vec_ref = &t.vec;
    if (vec_ref.is_empty()) default else vec_ref[0]
}
```

## Function `fill`

Convert the none option `t` to a some option by adding `e` . Aborts if `t` already holds a value

```
public fun fill<Element>(t: &mut std::option::Option<Element>, e: Element)
```

Click to open Implementation
```
public fun fill<Element>(t: &mut Option<Element>, e: Element) {
    let vec_ref = &mut t.vec;
    if (vec_ref.is_empty()) vec_ref.push_back(e) else abort EOPTION_IS_SET
}
```

## Function `extract`

Convert a
```
some
```

option to a
```
none
```

by removing and returning the value stored inside `t` Aborts if `t` does not hold a value

```
public fun extract<Element>(t: &mut std::option::Option<Element>): Element
```

Click to open Implementation
```
public fun extract<Element>(t: &mut Option<Element>): Element {
    assert!(t.is_some(), EOPTION_NOT_SET);
    t.vec.pop_back()
}
```

## Function `borrow_mut`

Return a mutable reference to the value inside `t` Aborts if `t` does not hold a value

```
public fun borrow_mut<Element>(t: &mut std::option::Option<Element>): &mut Element
```

Click to open Implementation
```
public fun borrow_mut<Element>(t: &mut Option<Element>): &mut Element {
    assert!(t.is_some(), EOPTION_NOT_SET);
    &mut t.vec[0]
}
```

## Function `swap`

Swap the old value inside `t` with `e` and return the old value Aborts if `t` does not hold a value

```
public fun swap<Element>(t: &mut std::option::Option<Element>, e: Element): Element
```

Click to open Implementation
```
public fun swap<Element>(t: &mut Option<Element>, e: Element): Element {
    assert!(t.is_some(), EOPTION_NOT_SET);
    let vec_ref = &mut t.vec;
    let old_value = vec_ref.pop_back();
    vec_ref.push_back(e);
    old_value
}
```

## Function `swap_or_fill`

Swap the old value inside `t` with `e` and return the old value; or if there is no old value, fill it with `e` . Different from swap(), swap_or_fill() allows for `t` not holding a value.

```
public fun swap_or_fill<Element>(t: &mut std::option::Option<Element>, e: Element): std::option::Option<Element>
```

Click to open Implementation
```
public fun swap_or_fill<Element>(t: &mut Option<Element>, e: Element): Option<Element> {
    let vec_ref = &mut t.vec;
    let old_value = if (vec_ref.is_empty()) none() else some(vec_ref.pop_back());
    vec_ref.push_back(e);
    old_value
}
```

## Function `destroy_with_default`

Destroys `t.` If `t` holds a value, return it. Returns `default` otherwise

```
public fun destroy_with_default<Element: drop>(t: std::option::Option<Element>, default: Element): Element
```

Click to open Implementation
```
public fun destroy_with_default<Element: drop>(t: Option<Element>, default: Element): Element {
    let Option { mut vec } = t;
    if (vec.is_empty()) default else vec.pop_back()
}
```

## Function `destroy_some`

Unpack `t` and return its contents Aborts if `t` does not hold a value

```
public fun destroy_some<Element>(t: std::option::Option<Element>): Element
```

Click to open Implementation
```
public fun destroy_some<Element>(t: Option<Element>): Element {
    assert!(t.is_some(), EOPTION_NOT_SET);
    let Option { mut vec } = t;
    let elem = vec.pop_back();
    vec.destroy_empty();
    elem
}
```

## Function `destroy_none`

Unpack `t` Aborts if `t` holds a value

```
public fun destroy_none<Element>(t: std::option::Option<Element>)
```

Click to open Implementation
```
public fun destroy_none<Element>(t: Option<Element>) {
    assert!(t.is_none(), EOPTION_IS_SET);
    let Option { vec } = t;
    vec.destroy_empty()
}
```

## Function `to_vec`

Convert `t` into a vector of length 1 if it is `Some` , and an empty vector otherwise

```
public fun to_vec<Element>(t: std::option::Option<Element>): vector<Element>
```

Click to open Implementation
```
public fun to_vec<Element>(t: Option<Element>): vector<Element> {
    let Option { vec } = t;
    vec
}
```

## Macro function `destroy`

Destroy
```
Option<T>
```

and call the closure `f` on the value inside if it holds one.

```
public macro fun destroy<$T, $R: drop>($o: std::option::Option<$T>, $f: |$T| -> $R)
```

Click to open Implementation
```
public macro fun destroy<$T, $R: drop>($o: Option<$T>, $f: |$T| -> $R) {
    let o = $o;
    o.do!($f);
}
```

## Macro function `do`

Destroy
```
Option<T>
```

and call the closure `f` on the value inside if it holds one.

```
public macro fun do<$T, $R: drop>($o: std::option::Option<$T>, $f: |$T| -> $R)
```

Click to open Implementation
```
public macro fun do<$T, $R: drop>($o: Option<$T>, $f: |$T| -> $R) {
    let o = $o;
    if (o.is_some()) { $f(o.destroy_some()); } else o.destroy_none()
}
```

## Macro function `do_ref`

Execute a closure on the value inside `t` if it holds one.

```
public macro fun do_ref<$T, $R: drop>($o: &std::option::Option<$T>, $f: |&$T| -> $R)
```

Click to open Implementation
```
public macro fun do_ref<$T, $R: drop>($o: &Option<$T>, $f: |&$T| -> $R) {
    let o = $o;
    if (o.is_some()) { $f(o.borrow()); }
}
```

## Macro function `do_mut`

Execute a closure on the mutable reference to the value inside `t` if it holds one.

```
public macro fun do_mut<$T, $R: drop>($o: &mut std::option::Option<$T>, $f: |&mut $T| -> $R)
```

Click to open Implementation
```
public macro fun do_mut<$T, $R: drop>($o: &mut Option<$T>, $f: |&mut $T| -> $R) {
    let o = $o;
    if (o.is_some()) { $f(o.borrow_mut()); }
}
```

## Macro function `or`

Select the first `Some` value from the two options, or `None` if both are `None` . Equivalent to Rust's
```
a.or(b)
```

.

```
public macro fun or<$T>($o: std::option::Option<$T>, $default: std::option::Option<$T>): std::option::Option<$T>
```

Click to open Implementation
```
public macro fun or<$T>($o: Option<$T>, $default: Option<$T>): Option<$T> {
    let o = $o;
    if (o.is_some()) {
        o
    } else {
        o.destroy_none();
        $default
    }
}
```

## Macro function `and`

If the value is `Some` , call the closure `f` on it. Otherwise, return `None` . Equivalent to Rust's `t.and_then(f)` .

```
public macro fun and<$T, $U>($o: std::option::Option<$T>, $f: |$T| -> std::option::Option<$U>): std::option::Option<$U>
```

Click to open Implementation
```
public macro fun and<$T, $U>($o: Option<$T>, $f: |$T| -> Option<$U>): Option<$U> {
    let o = $o;
    if (o.is_some()) {
        $f(o.destroy_some())
    } else {
        o.destroy_none();
        none()
    }
}
```

## Macro function `and_ref`

If the value is `Some` , call the closure `f` on it. Otherwise, return `None` . Equivalent to Rust's `t.and_then(f)` .

```
public macro fun and_ref<$T, $U>($o: &std::option::Option<$T>, $f: |&$T| -> std::option::Option<$U>): std::option::Option<$U>
```

Click to open Implementation
```
public macro fun and_ref<$T, $U>($o: &Option<$T>, $f: |&$T| -> Option<$U>): Option<$U> {
    let o = $o;
    if (o.is_some()) $f(o.borrow()) else none()
}
```

## Macro function `map`

Map an
```
Option<T>
```

to
```
Option<U>
```

by applying a function to a contained value. Equivalent to Rust's
```
t.map(f)
```

.

```
public macro fun map<$T, $U>($o: std::option::Option<$T>, $f: |$T| -> $U): std::option::Option<$U>
```

Click to open Implementation
```
public macro fun map<$T, $U>($o: Option<$T>, $f: |$T| -> $U): Option<$U> {
    let o = $o;
    if (o.is_some()) {
        some($f(o.destroy_some()))
    } else {
        o.destroy_none();
        none()
    }
}
```

## Macro function `map_ref`

Map an
```
Option<T>
```

value to
```
Option<U>
```

by applying a function to a contained value by reference. Original
```
Option<T>
```

is preserved. Equivalent to Rust's
```
t.map(f)
```

.

```
public macro fun map_ref<$T, $U>($o: &std::option::Option<$T>, $f: |&$T| -> $U): std::option::Option<$U>
```

Click to open Implementation
```
public macro fun map_ref<$T, $U>($o: &Option<$T>, $f: |&$T| -> $U): Option<$U> {
    let o = $o;
    if (o.is_some()) some($f(o.borrow())) else none()
}
```

## Macro function `filter`

Return `None` if the value is `None` , otherwise return
```
Option<T>
```

if the predicate `f` returns true.

```
public macro fun filter<$T: drop>($o: std::option::Option<$T>, $f: |&$T| -> bool): std::option::Option<$T>
```

Click to open Implementation
```
public macro fun filter<$T: drop>($o: Option<$T>, $f: |&$T| -> bool): Option<$T> {
    let o = $o;
    if (o.is_some() && $f(o.borrow())) o else none()
}
```

## Macro function `is_some_and`

Return
```
false
```

if the value is `None` , otherwise return the result of the predicate `f` .

```
public macro fun is_some_and<$T>($o: &std::option::Option<$T>, $f: |&$T| -> bool): bool
```

Click to open Implementation
```
public macro fun is_some_and<$T>($o: &Option<$T>, $f: |&$T| -> bool): bool {
    let o = $o;
    o.is_some() && $f(o.borrow())
}
```

## Macro function `extract_or`

Extract the value inside
```
Option<T>
```

if it holds one, or `default` otherwise. Similar to
```
destroy_or
```

, but modifying the input
```
Option
```

via a mutable reference.

```
public macro fun extract_or<$T>($o: &mut std::option::Option<$T>, $default: $T): $T
```

Click to open Implementation
```
public macro fun extract_or<$T>($o: &mut Option<$T>, $default: $T): $T {
    let o = $o;
    if (o.is_some()) o.extract() else $default
}
```

## Macro function `destroy_or`

Destroy
```
Option<T>
```

and return the value inside if it holds one, or `default` otherwise. Equivalent to Rust's `t.unwrap_or(default)` .

Note: this function is a more efficient version of
```
destroy_with_default
```

, as it does not evaluate the default value unless necessary. The
```
destroy_with_default
```

function should be deprecated in favor of this function.

```
public macro fun destroy_or<$T>($o: std::option::Option<$T>, $default: $T): $T
```

Click to open Implementation
```
public macro fun destroy_or<$T>($o: Option<$T>, $default: $T): $T {
    let o = $o;
    if (o.is_some()) {
        o.destroy_some()
    } else {
        o.destroy_none();
        $default
    }
}
```