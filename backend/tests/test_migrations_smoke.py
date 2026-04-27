from pathlib import Path


def test_alembic_versions_exist():
    base = Path(__file__).resolve().parents[1] / "alembic" / "versions"
    assert base.exists()
    revisions = sorted(p.name for p in base.glob("*.py"))
    assert "0001_baseline_existing_schema.py" in revisions
    assert "0002_create_auth_tables.py" in revisions
    assert "0003_org_scoping_audit_and_seeds.py" in revisions
