from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, date

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///projectflow.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    priority = db.Column(db.String(20), default='Medium')
    status = db.Column(db.String(20), default='Not started')
    # Manual progress override if needed, but we'll calculate it
    manual_progress = db.Column(db.Float, nullable=True) 
    
    operations = db.relationship('Operation', backref='project', lazy=True, cascade="all, delete-orphan")
    tasks = db.relationship('Task', backref='project', lazy=True, cascade="all, delete-orphan")

    @property
    def progress(self):
        if self.manual_progress is not None:
            return self.manual_progress
        if not self.tasks:
            return 0.0
        completed = sum(1 for t in self.tasks if t.completed)
        return round((completed / len(self.tasks)) * 100, 2)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)

class Operation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    date = db.Column(db.Date, default=date.today)
    source = db.Column(db.String(50))
    op_type = db.Column(db.String(100))
    is_client_present = db.Column(db.Boolean, default=False)
    is_docs_complete = db.Column(db.Boolean, default=True)
    missing_docs = db.Column(db.Text)
    amount_ht = db.Column(db.Float, default=0.0)
    tva = db.Column(db.Float, default=0.0)
    total_ttc = db.Column(db.Float, default=0.0)

@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = Project.query.all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'start_date': p.start_date.isoformat() if p.start_date else None,
        'end_date': p.end_date.isoformat() if p.end_date else None,
        'priority': p.priority,
        'status': p.status,
        'progress': p.progress,
        'tasks': [{'id': t.id, 'title': t.title, 'completed': t.completed} for t in p.tasks]
    } for p in projects])

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    new_project = Project(
        name=data.get('name'),
        start_date=datetime.strptime(data.get('start_date'), '%Y-%m-%d').date() if data.get('start_date') else None,
        end_date=datetime.strptime(data.get('end_date'), '%Y-%m-%d').date() if data.get('end_date') else None,
        priority=data.get('priority', 'Medium'),
        status=data.get('status', 'Not started')
    )
    db.session.add(new_project)
    db.session.commit()
    return jsonify({'id': new_project.id}), 201

@app.route('/api/projects/<int:id>', methods=['GET'])
def get_project(id):
    p = Project.query.get_or_404(id)
    ops = Operation.query.filter_by(project_id=id).all()
    return jsonify({
        'id': p.id,
        'name': p.name,
        'start_date': p.start_date.isoformat() if p.start_date else None,
        'end_date': p.end_date.isoformat() if p.end_date else None,
        'priority': p.priority,
        'status': p.status,
        'progress': p.progress,
        'tasks': [{'id': t.id, 'title': t.title, 'completed': t.completed} for t in p.tasks],
        'operations': [{
            'id': o.id,
            'date': o.date.isoformat(),
            'source': o.source,
            'type': o.op_type,
            'is_client_present': o.is_client_present,
            'is_docs_complete': o.is_docs_complete,
            'missing_docs': o.missing_docs,
            'amount_ht': o.amount_ht,
            'tva': o.tva,
            'total_ttc': o.total_ttc
        } for o in ops]
    })

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    new_task = Task(
        project_id=data.get('project_id'),
        title=data.get('title')
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify({'id': new_task.id}), 201

@app.route('/api/tasks/<int:id>/toggle', methods=['POST'])
def toggle_task(id):
    t = Task.query.get_or_404(id)
    t.completed = not t.completed
    db.session.commit()
    return jsonify({'completed': t.completed})

@app.route('/api/operations', methods=['POST'])
def create_operation():
    data = request.json
    total_ttc = float(data.get('amount_ht', 0)) + float(data.get('tva', 0))
    new_op = Operation(
        project_id=data.get('project_id'),
        date=datetime.strptime(data.get('date'), '%Y-%m-%d').date() if data.get('date') else date.today(),
        source=data.get('source'),
        op_type=data.get('type'),
        is_client_present=data.get('is_client_present', False),
        is_docs_complete=data.get('is_docs_complete', True),
        missing_docs=data.get('missing_docs'),
        amount_ht=data.get('amount_ht', 0.0),
        tva=data.get('tva', 0.0),
        total_ttc=total_ttc
    )
    db.session.add(new_op)
    db.session.commit()
    return jsonify({'id': new_op.id}), 201

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    ops = Operation.query.all()
    wallet = {}
    total_ht = 0
    total_tva = 0
    for op in ops:
        month = op.date.strftime('%B %Y')
        if month not in wallet:
            wallet[month] = {'ht': 0, 'tva': 0, 'ttc': 0}
        wallet[month]['ht'] += op.amount_ht
        wallet[month]['tva'] += op.tva
        wallet[month]['ttc'] += op.total_ttc
        total_ht += op.amount_ht
        total_tva += op.tva
    return jsonify({
        'total_ht': total_ht,
        'total_tva': total_tva,
        'wallet': wallet
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)
