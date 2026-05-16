# tasks

Per-case task checklists with a reusable template system. Tasks are scoped to a case; templates are scoped to a tenant. All queries use `forTenant(tenantId)`.

## HTTP Endpoints

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/tasks` | List all tasks for a case |
| `POST` | `/cases/:caseId/tasks` | Add a task to a case |
| `PATCH` | `/tasks/:id` | Update task (mark complete, reassign, change due date) |
| `DELETE` | `/tasks/:id` | Remove a task |

### Task Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/task-templates` | List all templates for the tenant |
| `POST` | `/task-templates` | Create a reusable task template |
| `PATCH` | `/task-templates/:id` | Update a template |
| `DELETE` | `/task-templates/:id` | Delete a template |

## Key Service Methods

### TasksService
- `findAll(tenantId, caseId)` — returns tasks for the case; validates case ownership
- `create(tenantId, caseId, dto)` — creates a task linked to the case
- `update(tenantId, id, dto)` — patches task fields; `completedAt` is set when status flips to complete
- `remove(tenantId, id)` — hard deletes the task record

### TaskTemplatesService
- `findAll(tenantId)` — returns all templates for the tenant
- `create(tenantId, dto)` — creates a reusable template
- `createFromTemplates(tenantId, caseId, tx)` — called during intake; instantiates all active tenant templates as `Task` rows within a provided Prisma transaction context

## DTOs

- `CreateTaskDto` — title, description, assigneeId, dueDate
- `UpdateTaskDto` — partial of CreateTaskDto plus status
- `CreateTaskTemplateDto` — title, description, defaultAssigneeRole, sortOrder

## Prisma Models Touched

- `Task`
- `TaskTemplate`

## Integration Points

- **IntakeModule** — `TaskTemplatesService.createFromTemplates()` is called inside the intake transaction to instantiate the default task set for a new case
- **CasesModule** — tasks are always accessed through a case; case ownership is validated before any task operation

## Notable Patterns

- `createFromTemplates()` accepts a Prisma transaction client (`tx`) so it participates in the atomic intake transaction without opening a nested transaction
- Templates define the default task set per tenant; they are instantiated as discrete `Task` records per case and are then independently manageable
- Task completion sets `completedAt` timestamp rather than relying solely on a status enum, enabling duration reporting
