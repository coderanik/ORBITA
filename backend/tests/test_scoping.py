from sqlalchemy import select

from app.auth.scoping import enforce_org_scope
from app.models.operator import Operator


def _where_sql(query):
    compiled = str(query.compile(compile_kwargs={"literal_binds": True}))
    return compiled.lower()


def test_scope_applies_org_filter_for_non_admin():
    query = enforce_org_scope(select(Operator), Operator, {"role": "operator", "org_id": 42})
    sql = _where_sql(query)
    assert "org_id = 42" in sql
    assert "is_deleted" in sql


def test_scope_skips_org_filter_for_global_admin():
    query = enforce_org_scope(select(Operator), Operator, {"role": "admin", "org_id": None})
    sql = _where_sql(query)
    assert "org_id =" not in sql
    assert "is_deleted" in sql
