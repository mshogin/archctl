# Использование DocHub Validator CLI

## Быстрый старт

### Проверка workspace

```bash
node src/cli.mjs --workspace /path/to/your/workspace
```

### Что вы увидите

#### ✅ Если валидация прошла успешно:

```
DocHub Architecture Validation
==================================================

✓ Manifest loaded successfully
  Workspace: /path/to/workspace
  Root: /path/to/workspace/dochub.yaml

==================================================
✓ Validation PASSED
```

Exit code: `0`

#### ✗ Если есть ошибки валидации:

```
DocHub Architecture Validation
==================================================

✓ Manifest loaded successfully
  Workspace: /path/to/workspace
  Root: /path/to/workspace/dochub.yaml

Summary:
  Validation issues: 3

Found 3 validation issue(s):

[component-naming] Неправильное именование компонентов
  ✗ Компонент 'MyApp' не соответствует правилам именования
    Location: /components/MyApp
    Fix: Используйте kebab-case: my-app

[missing-description] Отсутствует описание
  ✗ У компонента 'web-service' нет описания
    Location: /components/web-service
    Fix: Добавьте поле 'description'

==================================================
✗ Validation FAILED
```

Exit code: `1`

## Опции командной строки

```bash
# Базовая валидация
node src/cli.mjs --workspace ./architecture

# JSON формат (для CI/CD)
node src/cli.mjs --workspace ./architecture --format json

# Сохранить отчет в файл
node src/cli.mjs --workspace ./architecture --format json --output report.json

# Подробный вывод (debugging)
node src/cli.mjs --workspace ./architecture --verbose

# Без цветов (для логов)
node src/cli.mjs --workspace ./architecture --no-color
```

## Форматы вывода

### TEXT (по умолчанию)

Человеко-читаемый формат с цветами и структурированной информацией.

### JSON

Машинно-читаемый формат для CI/CD:

```json
{
  "success": false,
  "manifest": {
    "loaded": true,
    "path": "/workspace/dochub.yaml",
    "workspace": "/workspace"
  },
  "stats": {
    "totalIssues": 3,
    "loadingErrors": 0,
    "validationErrors": 3
  },
  "problems": [
    {
      "id": "component-naming",
      "title": "Неправильное именование компонентов",
      "items": [...]
    }
  ]
}
```

## Exit коды

- `0` - Валидация успешна
- `1` - Найдены ошибки валидации
- `2` - Критическая ошибка (файл не найден, ошибка парсинга YAML и т.д.)

## Использование в CI/CD

### GitHub Actions

```yaml
- name: Validate Architecture
  run: |
    node src/cli.mjs --workspace . --format json --output validation-report.json
  working-directory: ./archctl

- name: Upload report
  uses: actions/upload-artifact@v3
  with:
    name: validation-report
    path: validation-report.json
```

### GitLab CI

```yaml
validate:
  script:
    - node archctl/src/cli.mjs --workspace . --format json
  artifacts:
    reports:
      junit: validation-report.json
```

## Verbose режим

Используйте `--verbose` для отладки:

```bash
node src/cli.mjs --workspace ./architecture --verbose
```

Покажет:
- Процесс загрузки манифестов
- Выполнение валидаторов
- Количество найденных проблем по каждому валидатору
- Технические детали

## Что валидируется?

Инструмент выполняет все валидаторы определенные в:

1. **Base metamodel** (`DocHub/src/assets/base.yaml`):
   - Целостность компонентов
   - Иерархия аспектов
   - Связи между компонентами
   - Компоненты в контекстах
   - И другие проверки качества архитектуры

2. **Ваши кастомные валидаторы** (в `dochub.yaml` в секции `rules.validators`)

## Примеры

### Пример 1: Проверка перед commit

```bash
#!/bin/bash
# pre-commit hook

node path/to/archctl/src/cli.mjs --workspace .

if [ $? -ne 0 ]; then
  echo "❌ Architecture validation failed!"
  echo "Fix the errors before committing."
  exit 1
fi

echo "✅ Architecture validation passed"
```

### Пример 2: Ежедневная проверка

```bash
#!/bin/bash
# daily-check.sh

node archctl/src/cli.mjs \
  --workspace ./architecture \
  --format json \
  --output "reports/validation-$(date +%Y%m%d).json"

if [ $? -ne 0 ]; then
  # Отправить уведомление в Slack/Email
  echo "Validation failed, sending notification..."
fi
```

### Пример 3: Валидация нескольких workspace

```bash
#!/bin/bash

WORKSPACES=("project-a" "project-b" "project-c")

for ws in "${WORKSPACES[@]}"; do
  echo "Validating $ws..."
  node archctl/src/cli.mjs --workspace "$ws"

  if [ $? -ne 0 ]; then
    echo "❌ $ws validation failed"
    FAILED=true
  fi
done

if [ "$FAILED" = true ]; then
  exit 1
fi

echo "✅ All workspaces validated successfully"
```

## Troubleshooting

### Проблема: "DocHub not found"

**Решение:**
```bash
cd archctl
ln -s ../DocHub dochub
```

### Проблема: "Root manifest not found"

**Решение:**
Убедитесь что в workspace есть файл `dochub.yaml`:
```bash
ls /path/to/workspace/dochub.yaml
```

Или укажите другой файл:
```bash
node src/cli.mjs --workspace ./architecture --root my-manifest.yaml
```

### Проблема: Много технических сообщений в выводе

**Решение:**
Это нормально если используете `--verbose`. Без verbose вывод будет чистым.

Если хотите совсем без логов:
```bash
node src/cli.mjs --workspace ./architecture 2>/dev/null
```

## Дополнительная информация

- [README.md](README.md) - Полная документация
- [QUICK_START.md](QUICK_START.md) - Быстрый старт
- [DocHub Documentation](https://dochub.info) - Документация DocHub

## Поддержка

- Issues: https://github.com/mshogin/archctl/issues
- Telegram: @archascode
