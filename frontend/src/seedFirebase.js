import { db } from './firebase';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

async function seedFirestore() {
  console.log("Starting to seed Firestore...");

  try {
    // Project 1
    const p1Ref = await addDoc(collection(db, "projects"), {
      name: "Construction Villa A",
      start_date: Timestamp.fromDate(new Date()),
      end_date: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
      priority: "High",
      status: "In progress",
      progress: 45,
      createdAt: serverTimestamp()
    });

    // Tasks for P1
    const tasks1 = ["Fondation", "Murs", "Dalle", "Plomberie"];
    for (const t of tasks1) {
      await addDoc(collection(db, "tasks"), {
        project_id: p1Ref.id,
        title: t,
        completed: Math.random() > 0.5,
        createdAt: serverTimestamp()
      });
    }

    // Operations for P1
    await addDoc(collection(db, "operations"), {
      project_id: p1Ref.id,
      date: Timestamp.fromDate(new Date()),
      source: "SGE",
      type: "Achat Matériel",
      is_client_present: true,
      is_docs_complete: true,
      amount_ht: 1500,
      tva: 300,
      total_ttc: 1800
    });

    console.log("Firestore seeded successfully!");
  } catch (e) {
    console.error("Error seeding Firestore: ", e);
  }
}

// We'll call this once or the user can click a button. 
// For now I'll just provide the code and the user can see the result.
seedFirestore();
