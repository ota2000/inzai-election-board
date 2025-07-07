# Contributing to Election Board Route Optimizer

Thank you for your interest in contributing to the Election Board Route Optimizer! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Python 3.9 or higher
- Git
- [uv](https://github.com/astral-sh/uv) package manager (recommended)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/inzai-election-board.git
   cd inzai-election-board
   ```

2. **Install dependencies**
   ```bash
   # Using uv (recommended)
   uv sync --dev
   
   # Or using pip
   pip install -e ".[dev]"
   ```

3. **Set up pre-commit hooks** (optional but recommended)
   ```bash
   pre-commit install
   ```

## 📝 How to Contribute

### Reporting Issues

1. **Search existing issues** to avoid duplicates
2. **Use issue templates** when available
3. **Provide detailed information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Python version)
   - Screenshots/logs if relevant

### Submitting Code Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Run tests and checks**
   ```bash
   # Run tests
   uv run pytest
   
   # Check code style
   black --check src/ tests/
   
   # Run linting
   flake8 src/ tests/
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎯 Coding Standards

### Python Code Style

- **Follow PEP 8** for Python code style
- **Use Black** for code formatting
- **Use type hints** for function parameters and return values
- **Write docstrings** for all public functions and classes

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code restructuring
- `test:` adding or updating tests
- `chore:` maintenance tasks

Examples:
```
feat: add route optimization for multiple districts
fix: resolve popup position calculation error
docs: update README with new API examples
```

### Code Organization

- **Separate concerns**: Each module should have a single responsibility
- **Use meaningful names**: Variables and functions should be self-explanatory
- **Add comments**: Explain complex logic and business rules
- **Handle errors**: Use proper exception handling

## 🧪 Testing

### Running Tests

```bash
# Run all tests
uv run pytest

# Run specific test file
uv run pytest tests/test_optimizer.py

# Run with coverage
uv run pytest --cov=src/election_optimizer
```

### Writing Tests

- **Test file naming**: `test_*.py` in the `tests/` directory
- **Test function naming**: `test_*` functions
- **Use fixtures**: For common test data and setup
- **Mock external dependencies**: API calls, file operations, etc.

Example test structure:
```python
import pytest
from election_optimizer.core.optimizer import RouteOptimizer

def test_route_optimization_basic():
    """Test basic route optimization functionality."""
    # Given
    optimizer = RouteOptimizer(config)
    
    # When
    result = optimizer.optimize_district(test_data)
    
    # Then
    assert result['distance'] > 0
    assert len(result['locations']) > 0
```

## 🌐 JavaScript/Web Interface

### Standards

- **ES6 modules**: Use modern JavaScript syntax
- **Consistent naming**: Use camelCase for variables and functions
- **JSDoc comments**: Document public functions
- **Responsive design**: Ensure mobile compatibility

### Testing

- Test the web interface manually across different browsers
- Verify mobile responsiveness
- Check accessibility features

## 📚 Documentation

### Types of Documentation

1. **Code documentation**: Inline comments and docstrings
2. **API documentation**: Function and class documentation
3. **User documentation**: README and usage examples
4. **Developer documentation**: This file and setup guides

### Writing Guidelines

- **Be clear and concise**
- **Use examples**: Show practical usage
- **Keep it updated**: Update docs when changing code
- **Use proper formatting**: Markdown for documentation files

## 🔄 Pull Request Process

1. **Ensure all tests pass**
2. **Update documentation** if needed
3. **Add changelog entry** for significant changes
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash commits** if requested

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
```

## 🤝 Code of Conduct

- **Be respectful**: Treat all contributors with respect
- **Be collaborative**: Work together to improve the project
- **Be inclusive**: Welcome contributors from all backgrounds
- **Be constructive**: Provide helpful feedback and suggestions

## 📞 Getting Help

- **Discord/Slack**: Join our community chat
- **GitHub Issues**: Ask questions using the Q&A template
- **Email**: Contact maintainers directly for private matters

## 🎉 Recognition

Contributors will be recognized in:
- **README.md**: Contributors section
- **CHANGELOG.md**: Release notes
- **Git history**: Commit authorship

Thank you for contributing to Election Board Route Optimizer! 🗳️✨