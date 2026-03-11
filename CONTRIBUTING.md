# Contributing to PayloadOps

Thank you for your interest in contributing! 🎉

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/PayloadOps.git`
3. **Create a branch**: `git checkout -b feature/your-feature-name`
4. **Set up the environment**: `cp .env.example .env && docker compose up -d`
5. **Make your changes**
6. **Run quality checks**: `make quality`
7. **Commit** with descriptive messages
8. **Push** and create a **Pull Request**

## Development Setup

```bash
# Start the development environment
cp .env.example .env
docker compose up -d --build

# Run tests
make test

# Run linter
make lint

# Run type checker
make typecheck
```

## Code Standards

- **PEP 8** compliance (enforced by `ruff`)
- **Type hints** on all function signatures
- **Docstrings** on all public functions and classes
- **Tests** for new features or bug fixes

## Commit Convention

Use clear, descriptive commit messages:

```
feat: add webhook retry configuration endpoint
fix: resolve tenant isolation leak in log queries
docs: update API documentation for v1.1
test: add integration tests for DLQ processing
refactor: extract template renderer to separate module
```

## Pull Request Guidelines

- Reference any related issues
- Include a clear description of changes
- Ensure all CI checks pass
- Add tests for new functionality

## Questions?

Open an issue and we'll be happy to help!
