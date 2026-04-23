# Documentation

Welcome to the Anki MCP Server documentation. This directory contains comprehensive guides for developers, users, and contributors.

## 📚 Documentation Index

### For Developers

- **[Development Guide](DEVELOPMENT.md)** - Complete guide for setting up and developing the project
- **[Build System](BUILD_SYSTEM.md)** - Detailed documentation of the build system and scripts
- **[API Documentation](API.md)** - Comprehensive API reference for all MCP tools

### Quick Start

1. **Installation**
   ```bash
   git clone https://github.com/nailuoGG/anki-mcp-server.git
   cd anki-mcp-server
   npm install
   ```

2. **Development**
   ```bash
   npm run dev
   ```

3. **Build**
   ```bash
   npm run build
   ```

4. **Release**
   ```bash
   npm run release
   ```

## 🏗️ Project Structure

```
docs/
├── README.md           # This file - documentation index
├── DEVELOPMENT.md      # Development guide
├── BUILD_SYSTEM.md     # Build system documentation
└── API.md             # API reference
```

## 🚀 Key Features

### Build System
- **Automated version management** - Synchronizes versions across all files
- **TypeScript compilation** - Fast, reliable TypeScript building
- **MCP package creation** - Generates `.mcpb` files for distribution
- **SHA256 calculation** - Security verification for packages

### Development Tools
- **Hot reload** - Automatic rebuilding on file changes
- **Code quality** - Formatting and linting with Biome
- **Testing** - Jest-based testing framework
- **Type safety** - Full TypeScript support

### MCP Integration
- **AnkiConnect integration** - Seamless Anki communication
- **Comprehensive API** - Full deck and note management
- **Error handling** - Robust error management
- **Type safety** - TypeScript definitions for all tools

## 📖 Documentation Overview

### Development Guide
The [Development Guide](DEVELOPMENT.md) covers:
- Prerequisites and setup
- Project structure
- Development workflow
- Build process
- Testing and quality checks
- Version management
- Release process
- Troubleshooting

### Build System
The [Build System](BUILD_SYSTEM.md) documentation includes:
- Architecture overview
- Build process details
- Script documentation
- Configuration options
- Error handling
- Performance considerations
- Troubleshooting

### API Documentation
The [API Documentation](API.md) provides:
- Complete tool reference
- Parameter specifications
- Return value formats
- Error handling
- Usage examples
- Best practices
- Troubleshooting

## 🛠️ Common Tasks

### Development
```bash
# Start development server
npm run dev

# Run tests
npm run test

# Format code
npm run format

# Check code quality
npm run check
```

### Building
```bash
# Development build
npm run build

# Production build
npm run build:prod

# Build without mcpb
npm run build:no-mcpb
```

### Release
```bash
# Complete release process
npm run release
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV` - Environment mode (`development` or `production`)
- `ANKI_CONNECT_URL` - AnkiConnect server URL

### Build Configuration
- `tsup.config.ts` - TypeScript compilation settings
- `package.json` - Project configuration and scripts
- `server.json` - MCP server configuration

## 🐛 Troubleshooting

### Common Issues
1. **Build failures** - Check TypeScript errors and dependencies
2. **AnkiConnect errors** - Ensure Anki is running with AnkiConnect enabled
3. **Version sync issues** - Run `npm run version:all`
4. **ES module errors** - Check import/export syntax

### Getting Help
1. Check the relevant documentation
2. Review error messages and logs
3. Check [GitHub Issues](https://github.com/nailuoGG/anki-mcp-server/issues)
4. Consult [MCP Documentation](https://modelcontextprotocol.io/)

## 📝 Contributing

### Development Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and quality checks
5. Submit a pull request

### Code Standards
- Follow existing code style
- Write tests for new features
- Update documentation
- Ensure all checks pass

## 🔗 External Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [AnkiConnect API](https://github.com/FooSoft/anki-connect)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Jest Testing Framework](https://jestjs.io/)
- [Biome Documentation](https://biomejs.dev/)

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

---

For questions or support, please open an [issue](https://github.com/nailuoGG/anki-mcp-server/issues) or refer to the specific documentation files above.
