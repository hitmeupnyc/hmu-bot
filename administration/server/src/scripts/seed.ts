import { prepare } from '../services/DatabaseService';

async function seed() {
  console.log('🌱 Seeding database with initial data...');
  
  try {
    // Seed payment statuses
    const paymentStatuses = [
      { name: 'pending', description: 'Payment pending', sort_order: 1 },
      { name: 'paid', description: 'Payment completed', sort_order: 2 },
      { name: 'comped', description: 'Complimentary membership', sort_order: 3 },
      { name: 'failed', description: 'Payment failed', sort_order: 4 }
    ];

    const insertPaymentStatus = prepare(`
      INSERT OR IGNORE INTO payment_statuses (name, description, sort_order, flags)
      VALUES (?, ?, ?, 1)
    `);

    for (const status of paymentStatuses) {
      insertPaymentStatus.run(status.name, status.description, status.sort_order);
    }

    // Seed membership types
    const membershipTypes = [
      { 
        name: 'Free Member', 
        description: 'Basic free membership', 
        price_cents: null, 
        flags: 1,
        benefits_json: JSON.stringify(['Community access', 'Event notifications'])
      },
      { 
        name: 'Professional Member', 
        description: 'Professional affiliate membership', 
        price_cents: 5000, 
        flags: 3, // active + recurring
        benefits_json: JSON.stringify(['All free benefits', 'Professional directory listing', 'Priority event access'])
      },
      { 
        name: 'Patron', 
        description: 'Monthly patron supporter', 
        price_cents: 1000, 
        flags: 3, // active + recurring
        benefits_json: JSON.stringify(['All free benefits', 'Monthly supporter perks'])
      }
    ];

    const insertMembershipType = prepare(`
      INSERT OR IGNORE INTO membership_types (name, description, price_cents, flags, benefits_json)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const type of membershipTypes) {
      insertMembershipType.run(
        type.name, 
        type.description, 
        type.price_cents, 
        type.flags, 
        type.benefits_json
      );
    }

    console.log('✅ Database seeded successfully');
    console.log(`   - ${paymentStatuses.length} payment statuses`);
    console.log(`   - ${membershipTypes.length} membership types`);
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}
