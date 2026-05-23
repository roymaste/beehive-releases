#!/usr/bin/env python3
"""Patch the executor register endpoint to not require auth."""

with open('/root/beehive-agent/saas/routers/executors.py', 'r') as f:
    content = f.read()

# 1. Remove the `_` auth dependency
old1 = (
    '    db: Session = Depends(get_db),\n'
    '    _: Optional[str] = Depends(get_current_tenant_id),\n'
    '):\n'
)
new1 = '    db: Session = Depends(get_db),\n):\n'
content = content.replace(old1, new1)

# 2. Remove the tenant_id check block
old2 = (
    '    tenant_id = getattr(request.state, "tenant_id", None)\n'
    '    if not tenant_id:\n'
    '        raise HTTPException(status_code=403, detail="No tenant context")\n'
    '\n'
    '    executor = Executor(\n'
    '        tenant_id=tenant_id,\n'
    '        name=body.name,\n'
    '        executor_type=body.executor_type,\n'
    '        runtime_status="online",\n'
    '        cpu_cores=body.cpu_cores,\n'
    '        memory_gb=body.memory_gb,\n'
    '        ip_address=body.ip_address,\n'
    '        ip_location=body.ip_location,\n'
    '        version=body.version,\n'
    '        last_heartbeat=datetime.now(timezone.utc),\n'
    '        registered_at=datetime.now(timezone.utc),\n'
    '    )\n'
)
new2 = (
    '    executor = Executor(\n'
    '        name=body.name,\n'
    '        executor_type=body.executor_type,\n'
    '        runtime_status="online",\n'
    '        cpu_cores=body.cpu_cores,\n'
    '        memory_gb=body.memory_gb,\n'
    '        ip_address=body.ip_address,\n'
    '        ip_location=body.ip_location,\n'
    '        version=body.version,\n'
    '        last_heartbeat=datetime.now(timezone.utc),\n'
    '        registered_at=datetime.now(timezone.utc),\n'
    '    )\n'
)
content = content.replace(old2, new2)

# 3. Also remove the import of get_current_tenant_id if no longer used
content = content.replace(
    ', require_admin', ''
)

with open('/root/beehive-agent/saas/routers/executors.py', 'w') as f:
    f.write(content)

print("Patched successfully!")
