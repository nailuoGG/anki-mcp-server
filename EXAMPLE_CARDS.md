# Example Cards System

## Overview

The example cards system allows users to create example cards for specific note types, which serve as templates and references for those note types. Compared to traditional template comment parsing solutions, the example cards approach is more flexible, user-friendly, and robust.

## Key Features

1. **Ease of Use**: Users can create and manage example cards directly in Anki
2. **Flexibility**: Supports multiple marking methods and description information
3. **Robustness**: Does not rely on template parsing, avoiding parsing errors
4. **Maintainability**: Example cards are stored as regular cards, benefiting from Anki's sync and backup mechanisms

## Configuration

Example cards are identified by specific tags, with default configuration including:

```typescript
exampleTags: ["example-card", "template-example", "示例卡片"];
```

## API Methods

### 1. Get Note Type Examples

```typescript
const examples = await ankiClient.getModelExamples("Basic");
```

Return format:

```json
{
  "modelName": "Basic",
  "fields": ["Front", "Back"],
  "examples": [
    {
      "description": "Basic TypeScript definition example",
      "fields": {
        "Front": "What is TypeScript?",
        "Back": "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript."
      },
      "noteId": 12345
    }
  ]
}
```

### 2. Create Example Card

```typescript
const noteId = await ankiClient.createExampleCard({
  modelName: "Basic",
  fields: {
    Front: "What is TypeScript?",
    Back: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
  },
  description: "Basic TypeScript definition example",
  deckName: "Programming::TypeScript",
});
```

### 3. Update Example Card

```typescript
await ankiClient.updateExampleCard({
  noteId: 12345,
  fields: {
    Front: "Updated question",
    Back: "Updated answer",
  },
  description: "Updated description",
});
```

## MCP Tools

### 1. `get_note_type_examples`

Get example cards for a specific note type.

**Parameters:**

- `modelName` (string): Note type name

**Example:**

```json
{
  "modelName": "Basic"
}
```

### 2. `create_example_card`

Create a new example card.

**Parameters:**

- `modelName` (string): Note type name
- `fields` (object): Field values
- `description` (string, optional): Example description
- `deckName` (string, optional): Target deck name

**Example:**

```json
{
  "modelName": "Basic",
  "fields": {
    "Front": "What is TypeScript?",
    "Back": "TypeScript is a typed superset of JavaScript."
  },
  "description": "Basic TypeScript definition example",
  "deckName": "Programming"
}
```

### 3. `update_example_card`

Update an existing example card.

**Parameters:**

- `noteId` (number): Card ID
- `fields` (object): New field values
- `description` (string, optional): New description

**Example:**

```json
{
  "noteId": 12345,
  "fields": {
    "Front": "Updated question",
    "Back": "Updated answer"
  },
  "description": "Updated description"
}
```

### 4. `find_example_cards`

Find example cards for a specific note type.

**Parameters:**

- `modelName` (string): Note type name

**Example:**

```json
{
  "modelName": "Basic"
}
```

## Usage Guidelines

1. **Create Example Cards**: Create 2-3 example cards for each note type to showcase different usage scenarios
2. **Description Information**: Use descriptive tags or fields to identify the purpose and characteristics of examples
3. **Organization Management**: Place example cards in dedicated decks for easy management and discovery
4. **Regular Updates**: Update example cards promptly as note types change

## Best Practices

1. **Tag Management**: Use consistent tags to identify example cards
2. **Description Strategy**: Provide clear descriptions for each example
3. **Field Completeness**: Ensure all fields have meaningful content
4. **Regular Maintenance**: Periodically review and update example cards
5. **Organization**: Group related example cards in dedicated decks

## Technical Details

### Example Card Identification

The system identifies example cards using:

1. **Special Tags**: Cards with tags like `example-card`, `template-example`, or `示例卡片`
2. **Note Type Matching**: Cards that belong to the specified note type
3. **Description Extraction**: Automatic extraction of descriptions from tags or fields

### Description Extraction Priority

1. **Description Tags**: Tags starting with `description:`
2. **Description Fields**: Fields named `Description`, `Note`, `Comment`, `描述`, `说明`, or `注释`
3. **Field Preview**: First 50 characters of the first non-empty field
4. **Default**: Card ID-based description

### Error Handling

- Graceful handling of missing example cards
- Fallback to default descriptions when extraction fails
- Proper error messages for invalid operations
- Retry logic for network-related issues

## Limitations

1. Example cards consume Anki storage space
2. Tags affect Anki's tag system
3. Example cards are included in sync operations
4. Requires manual management of example card lifecycle
