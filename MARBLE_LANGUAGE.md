# Marble Language Support

This extension provides comprehensive syntax highlighting and language support for Marble files used in IFS Cloud development.

## Features

### 🎨 Syntax Highlighting

- **Keywords**: Control flow, declarations, modifiers, operators
- **Types**: Built-in types, user-defined types, annotations
- **Strings**: Single and double quoted strings with escape sequences
- **Numbers**: Integers, decimals, hexadecimal, binary literals
- **Comments**: Line comments (`//`, `#`) and block comments (`/* */`)
- **Functions**: Function names and calls
- **Variables**: Parameters (`$var`), references (`&var`), constants
- **Operators**: Arithmetic, logical, comparison, assignment operators
- **Annotations**: `@Entity`, `@Key`, `@Required`, etc.

### 🌈 Custom Theme

The extension includes a custom dark theme optimized for Marble syntax:

- **Entity definitions**: Green highlighting for types
- **Keywords**: Bold red for control flow and declarations
- **Functions**: Purple for function names
- **Annotations**: Bold red for decorators
- **Variables**: Orange for parameters and variables
- **Comments**: Italic gray for all comment types

### ✂️ Code Snippets

Pre-built snippets for common Marble patterns:

- `entity` - Entity definition with annotations
- `view` - View definition
- `function` - Service function
- `async` - Async function with error handling
- `class` - Class definition
- `interface` - Interface definition
- `enum` - Enumeration definition
- `if`, `ifelse` - Conditional statements
- `for`, `while` - Loop constructs
- `try` - Try-catch-finally blocks
- `switch` - Switch statements

### 🔧 Language Features

- **Auto-closing pairs**: Brackets, parentheses, quotes
- **Bracket matching**: Highlighting matching brackets
- **Comment toggling**: Quickly comment/uncomment code
- **Auto-indentation**: Smart indentation based on code structure

## File Extensions

The extension automatically activates for files with the `.marble` extension.

## Usage

1. Create or open a file with the `.marble` extension
2. The syntax highlighting will be applied automatically
3. Use code snippets by typing the snippet prefix and pressing Tab
4. Apply the custom theme: `Ctrl+K Ctrl+T` → "IFS Cloud Marble Dark"

## Example Marble Code

```marble
// Entity definition with annotations
@Entity
@Table("customer_orders")
entity CustomerOrder {
    @Key
    orderId: string;

    @Required
    customerName: string;

    orderDate: Date;
    totalAmount: decimal;

    public function calculateTotal(): decimal {
        // Implementation here
        return totalAmount;
    }
}

// Service with async function
service OrderService {
    async function processOrder(order: CustomerOrder): Promise<OrderResult> {
        try {
            var result = await PaymentGateway.charge(order.orderId);
            return SuccessResult(result);
        } catch (PaymentException ex) {
            log.error("Payment failed: " + ex.message);
            return ErrorResult(ex.message);
        }
    }
}
```

## Color Scheme

The custom theme uses a GitHub Dark inspired color palette:

- **Background**: Deep dark blue (#0d1117)
- **Keywords**: Bright red (#ff7b72)
- **Types**: Light blue (#79c0ff)
- **Functions**: Purple (#d2a8ff)
- **Strings**: Light cyan (#a5d6ff)
- **Comments**: Gray (#8b949e)
- **Variables**: Orange (#ffa657)
- **Annotations**: Bold red (#f85149)

## Contributing

If you find issues with the syntax highlighting or have suggestions for improvements, please open an issue or submit a pull request.

## License

This language support is part of the IFS Cloud MCP Server extension and follows the same MIT license.
