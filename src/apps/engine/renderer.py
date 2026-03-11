"""
PayloadOps — Template Renderer

Renders body templates by injecting webhook payload variables.
Supports nested variable access via dot notation (e.g., {{payload.user.name}}).
"""

from __future__ import annotations

import re  # noqa: I001
from typing import Any


# Match template variables: {{variable.path}}
TEMPLATE_PATTERN = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")


def resolve_variable(path: str, context: dict[str, Any]) -> Any:
    """
    Resolve a dot-notation variable path against a context dictionary.

    Examples:
        resolve_variable("payload.user.name", {"payload": {"user": {"name": "John"}}})
        → "John"
    """
    keys = path.split(".")
    value: Any = context
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
        else:
            return None
        if value is None:
            return None
    return value


def render_template(template: Any, context: dict[str, Any]) -> Any:
    """
    Recursively render a template structure (dict, list, or string)
    by replacing {{variable}} placeholders with actual values from context.

    Args:
        template: The template structure (dict, list, or string with placeholders)
        context: The variable context (typically {"payload": <webhook_payload>})

    Returns:
        The rendered structure with variables replaced.
    """
    if isinstance(template, str):
        # Check if the entire string is a single variable (preserve type)
        single_match = re.fullmatch(r"\{\{\s*([\w.]+)\s*\}\}", template)
        if single_match:
            resolved = resolve_variable(single_match.group(1), context)
            return resolved if resolved is not None else template

        # Otherwise, do string interpolation
        def replace_match(match: re.Match) -> str:
            resolved = resolve_variable(match.group(1), context)
            return str(resolved) if resolved is not None else match.group(0)

        return TEMPLATE_PATTERN.sub(replace_match, template)

    elif isinstance(template, dict):
        return {key: render_template(value, context) for key, value in template.items()}

    elif isinstance(template, list):
        return [render_template(item, context) for item in template]

    return template
