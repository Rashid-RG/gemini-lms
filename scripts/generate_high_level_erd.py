import json
import uuid

def nid():
    return uuid.uuid4().hex[:8].upper()

PROJECT_ID = "PRJ" + nid()
MODEL_ID = "DM" + nid()
DIAGRAM_ID = "DGM" + nid()

# entity_key -> (display_name, [(col_name, type, is_pk, is_fk)])
ENTITIES = {
    "users": ("users", [
        ("id", "INTEGER", True, False),
        ("name", "VARCHAR", False, False),
        ("email", "VARCHAR", False, False),
        ("credits", "INTEGER", False, False),
        ("isMember", "BOOLEAN", False, False),
    ]),
    "admins": ("admins", [
        ("id", "INTEGER", True, False),
        ("email", "VARCHAR", False, False),
        ("name", "VARCHAR", False, False),
        ("role", "VARCHAR", False, False),
    ]),
    "studyMaterial": ("studyMaterial", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, False),
        ("topic", "VARCHAR", False, False),
        ("createdBy", "VARCHAR", False, True),
        ("price", "DECIMAL", False, False),
        ("status", "VARCHAR", False, False),
    ]),
    "studyTypeContent": ("studyTypeContent", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("chapterId", "INTEGER", False, False),
        ("type", "VARCHAR", False, False),
    ]),
    "courseEnrollments": ("courseEnrollments", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("studentEmail", "VARCHAR", False, True),
        ("status", "VARCHAR", False, False),
        ("completionPercentage", "INTEGER", False, False),
    ]),
    "studentProgress": ("studentProgress", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("studentEmail", "VARCHAR", False, True),
        ("progressPercentage", "INTEGER", False, False),
        ("finalScore", "INTEGER", False, False),
    ]),
    "courseAssignments": ("courseAssignments", [
        ("id", "INTEGER", True, False),
        ("assignmentId", "VARCHAR", False, False),
        ("courseId", "VARCHAR", False, True),
        ("title", "VARCHAR", False, False),
        ("dueDate", "TIMESTAMP", False, False),
    ]),
    "assignmentSubmissions": ("assignmentSubmissions", [
        ("id", "INTEGER", True, False),
        ("assignmentId", "VARCHAR", False, True),
        ("courseId", "VARCHAR", False, True),
        ("studentEmail", "VARCHAR", False, True),
        ("score", "INTEGER", False, False),
        ("status", "VARCHAR", False, False),
    ]),
    "paymentRecord": ("paymentRecord", [
        ("id", "INTEGER", True, False),
        ("userEmail", "VARCHAR", False, True),
        ("amount", "DECIMAL", False, False),
        ("plan", "VARCHAR", False, False),
        ("status", "VARCHAR", False, False),
    ]),
    "creditTransactions": ("creditTransactions", [
        ("id", "INTEGER", True, False),
        ("userEmail", "VARCHAR", False, True),
        ("amount", "INTEGER", False, False),
        ("type", "VARCHAR", False, False),
    ]),
    "certificates": ("certificates", [
        ("id", "INTEGER", True, False),
        ("certificateId", "VARCHAR", False, False),
        ("courseId", "VARCHAR", False, True),
        ("studentEmail", "VARCHAR", False, True),
        ("finalScore", "INTEGER", False, False),
    ]),
    "courseReviews": ("courseReviews", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("studentEmail", "VARCHAR", False, True),
        ("rating", "INTEGER", False, False),
    ]),
    "mockExams": ("mockExams", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("title", "VARCHAR", False, False),
        ("passingScore", "INTEGER", False, False),
    ]),
    "mockExamSubmissions": ("mockExamSubmissions", [
        ("id", "INTEGER", True, False),
        ("mockExamId", "INTEGER", False, True),
        ("studentEmail", "VARCHAR", False, True),
        ("score", "INTEGER", False, False),
        ("passed", "BOOLEAN", False, False),
    ]),
    "courseDiscussions": ("courseDiscussions", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("chapterId", "INTEGER", False, False),
        ("studentEmail", "VARCHAR", False, True),
    ]),
    "discussionReplies": ("discussionReplies", [
        ("id", "INTEGER", True, False),
        ("discussionId", "INTEGER", False, True),
        ("authorEmail", "VARCHAR", False, True),
        ("role", "VARCHAR", False, False),
    ]),
    "tutorAssignments": ("tutorAssignments", [
        ("id", "INTEGER", True, False),
        ("adminId", "INTEGER", False, True),
        ("courseId", "VARCHAR", False, True),
        ("canReview", "BOOLEAN", False, False),
        ("canApprove", "BOOLEAN", False, False),
    ]),
    "gradeHistory": ("gradeHistory", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("studentEmail", "VARCHAR", False, True),
        ("oldScore", "INTEGER", False, False),
        ("newScore", "INTEGER", False, False),
    ]),
    "gradeCurves": ("gradeCurves", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("curveType", "VARCHAR", False, False),
        ("curveValue", "INTEGER", False, False),
    ]),
    "adaptivePerformance": ("adaptivePerformance", [
        ("id", "INTEGER", True, False),
        ("courseId", "VARCHAR", False, True),
        ("studentEmail", "VARCHAR", False, True),
        ("currentDifficulty", "VARCHAR", False, False),
        ("masteryLevel", "VARCHAR", False, False),
    ]),
}

# (from, to, name, end1_card, end2_card)
RELATIONSHIPS = [
    ("users", "studyMaterial", "creates", "1", "0..*"),
    ("users", "courseEnrollments", "enrolls in", "1", "0..*"),
    ("studyMaterial", "courseEnrollments", "has", "1", "0..*"),
    ("studyMaterial", "studyTypeContent", "contains", "1", "0..*"),
    ("users", "studentProgress", "tracks", "1", "0..*"),
    ("studyMaterial", "studentProgress", "tracked by", "1", "0..*"),
    ("studyMaterial", "courseAssignments", "has", "1", "0..*"),
    ("courseAssignments", "assignmentSubmissions", "receives", "1", "0..*"),
    ("users", "assignmentSubmissions", "submits", "1", "0..*"),
    ("users", "paymentRecord", "makes", "1", "0..*"),
    ("users", "creditTransactions", "has", "1", "0..*"),
    ("studyMaterial", "certificates", "issues", "1", "0..*"),
    ("users", "certificates", "receives", "1", "0..*"),
    ("studyMaterial", "courseReviews", "receives", "1", "0..*"),
    ("users", "courseReviews", "writes", "1", "0..*"),
    ("studyMaterial", "mockExams", "has", "1", "0..*"),
    ("mockExams", "mockExamSubmissions", "receives", "1", "0..*"),
    ("users", "mockExamSubmissions", "submits", "1", "0..*"),
    ("studyMaterial", "courseDiscussions", "has", "1", "0..*"),
    ("courseDiscussions", "discussionReplies", "has", "1", "0..*"),
    ("admins", "tutorAssignments", "assigned via", "1", "0..*"),
    ("studyMaterial", "tutorAssignments", "reviewed via", "1", "0..*"),
    ("studyMaterial", "gradeHistory", "logs", "1", "0..*"),
    ("users", "gradeHistory", "has", "1", "0..*"),
    ("studyMaterial", "gradeCurves", "has", "1", "0..1"),
    ("studyMaterial", "adaptivePerformance", "tracks", "1", "0..*"),
    ("users", "adaptivePerformance", "has", "1", "0..*"),
]

# Grid layout
COLS = 4
X_GAP = 480
Y_GAP = 420
X0, Y0 = 60, 60

elements = []
entity_node_id = {}
entity_view_id = {}

owned_elements_model = []

for idx, (key, (name, cols)) in enumerate(ENTITIES.items()):
    eid = "ENT" + nid()
    entity_node_id[key] = eid
    columns = []
    for cname, ctype, is_pk, is_fk in cols:
        cid = "COL" + nid()
        col = {
            "_type": "ERDColumn",
            "_id": cid,
            "_parent": {"$ref": eid},
            "name": cname,
            "type": ctype,
        }
        if is_pk:
            col["primaryKey"] = True
            col["unique"] = True
        if is_fk:
            col["foreignKey"] = True
        if not is_pk:
            col["nullable"] = True
        columns.append(col)
    entity = {
        "_type": "ERDEntity",
        "_id": eid,
        "_parent": {"$ref": MODEL_ID},
        "name": name,
        "columns": columns,
    }
    owned_elements_model.append(entity)

rel_elements = []
for (a, b, rname, c1, c2) in RELATIONSHIPS:
    rid = "REL" + nid()
    rel = {
        "_type": "ERDRelationship",
        "_id": rid,
        "_parent": {"$ref": MODEL_ID},
        "name": rname,
        "end1": {
            "_type": "ERDRelationshipEnd",
            "_id": "RE1" + nid(),
            "_parent": {"$ref": rid},
            "reference": {"$ref": entity_node_id[a]},
            "cardinality": c1,
        },
        "end2": {
            "_type": "ERDRelationshipEnd",
            "_id": "RE2" + nid(),
            "_parent": {"$ref": rid},
            "reference": {"$ref": entity_node_id[b]},
            "cardinality": c2,
        },
        "identifying": False,
    }
    rel_elements.append(rel)

owned_elements_model.extend(rel_elements)

# Diagram with views (grid layout positions)
diagram_views = []
keys = list(ENTITIES.keys())
positions = {}
for i, key in enumerate(keys):
    col = i % COLS
    row = i // COLS
    x = X0 + col * X_GAP
    y = Y0 + row * Y_GAP
    positions[key] = (x, y)
    vid = "EV" + nid()
    entity_view_id[key] = vid
    view = {
        "_type": "ERDEntityView",
        "_id": vid,
        "_parent": {"$ref": DIAGRAM_ID},
        "model": {"$ref": entity_node_id[key]},
        "left": x,
        "top": y,
        "width": 220,
        "height": 160,
        "containerChangeable": True,
        "containedViews": [],
    }
    diagram_views.append(view)

for (a, b, rname, c1, c2), rel in zip(RELATIONSHIPS, rel_elements):
    rvid = "RV" + nid()
    rview = {
        "_type": "ERDRelationshipView",
        "_id": rvid,
        "_parent": {"$ref": DIAGRAM_ID},
        "model": {"$ref": rel["_id"]},
        "head": {"$ref": entity_view_id[a]},
        "tail": {"$ref": entity_view_id[b]},
        "lineStyle": 1,
    }
    diagram_views.append(rview)

diagram = {
    "_type": "ERDDiagram",
    "_id": DIAGRAM_ID,
    "_parent": {"$ref": MODEL_ID},
    "name": "Gemini LMS - High-Level ERD",
    "ownedViews": diagram_views,
}

model = {
    "_type": "ERDDataModel",
    "_id": MODEL_ID,
    "_parent": {"$ref": PROJECT_ID},
    "name": "Gemini LMS High-Level Data Model",
    "ownedElements": owned_elements_model + [diagram],
}

project = {
    "_type": "Project",
    "_id": PROJECT_ID,
    "name": "Gemini-LMS-HighLevel-ERD",
    "ownedElements": [model],
}

with open("Gemini-LMS-HighLevel-ERD.mdj", "w", encoding="utf-8") as f:
    json.dump(project, f, indent=2)

print("Generated Gemini-LMS-HighLevel-ERD.mdj with", len(ENTITIES), "entities and", len(RELATIONSHIPS), "relationships")
