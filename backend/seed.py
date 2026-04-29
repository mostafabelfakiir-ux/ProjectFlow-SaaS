from app import db, Project, Operation, Task, app
from datetime import datetime, timedelta, date
import random

def seed():
    with app.app_context():
        db.drop_all()
        db.create_all()

        p1 = Project(
            name="Construction Villa A",
            start_date=date.today(),
            end_date=(date.today() + timedelta(days=90)),
            priority="High",
            status="In progress"
        )
        p2 = Project(
            name="Renovation Bureau B",
            start_date=(date.today() - timedelta(days=30)),
            end_date=(date.today() + timedelta(days=60)),
            priority="Medium",
            status="Not started"
        )
        
        db.session.add(p1)
        db.session.add(p2)
        db.session.commit()

        # Add tasks
        tasks1 = ["Fondation", "Murs", "Dalle", "Plomberie", "Electricité"]
        for t in tasks1:
            db.session.add(Task(project_id=p1.id, title=t, completed=random.choice([True, False])))
        
        tasks2 = ["Peinture", "Parquet", "Luminaires"]
        for t in tasks2:
            db.session.add(Task(project_id=p2.id, title=t, completed=False))

        # Add some operations
        sources = ['SGE', 'ORPCC']
        types = ['Achat Matériel', 'Main d\'œuvre', 'Transport']
        
        for i in range(10):
            ht = random.uniform(500, 3000)
            tva = ht * 0.2
            op = Operation(
                project_id=random.choice([p1.id, p2.id]),
                date=(date.today() - timedelta(days=random.randint(0, 60))),
                source=random.choice(sources),
                op_type=random.choice(types),
                is_client_present=random.choice([True, False]),
                is_docs_complete=random.choice([True, False]),
                missing_docs="Bon de commande" if random.random() > 0.8 else "",
                amount_ht=ht,
                tva=tva,
                total_ttc=ht + tva
            )
            db.session.add(op)
        
        db.session.commit()
        print("Database seeded with tasks and operations!")

if __name__ == "__main__":
    seed()
