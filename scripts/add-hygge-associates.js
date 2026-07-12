#!/usr/bin/env node

/**
 * Add Associate People to Hygge & Hvidløg Demo Data
 *
 * Creates realistic associates for the Danish sustainable food tech company:
 * - Board members
 * - Consultants
 * - Advisors
 * - External contractors
 * - Business partners
 */

import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Missing required environment variables'));
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: supabaseServiceKey,
  Authorization: `Bearer ${supabaseServiceKey}`,
  'Content-Type': 'application/json',
};

async function addHyggeAssociates() {
  try {
    console.log(chalk.blue('🤝 Adding associate people to Hygge & Hvidløg...'));

    // First, get the Hygge & Hvidløg client ID
    const clientResponse = await fetch(
      `${supabaseUrl}/rest/v1/clients?select=id,legal_name&client_code=eq.hygge-hvidlog`,
      {
        headers,
      }
    );

    if (!clientResponse.ok) {
      const errorText = await clientResponse.text();
      console.error(
        chalk.red(`❌ Error fetching client: HTTP ${clientResponse.status} - ${errorText}`)
      );
      return;
    }

    const clients = await clientResponse.json();
    if (!clients || clients.length === 0) {
      console.error(chalk.red('❌ Hygge & Hvidløg client not found'));
      return;
    }

    const client = clients[0];
    console.log(chalk.green(`✅ Found client: ${client.legal_name} (ID: ${client.id})`));

    // Define realistic associates for a Danish sustainable food tech company
    const associatesData = [
      // Board Members
      {
        client_id: client.id,
        person_code: 'assoc-001',
        first_name: 'Mette',
        last_name: 'Damsgaard',
        company_email: 'mette.damsgaard@board.hygge-hvidlog.dk',
        department: 'Board of Directors',
        position: 'Chairman of the Board',
        location: 'Copenhagen, Denmark',
        associate_status: 'board_member',
        employment_status: null,
        start_date: '2022-01-01',
        employment_type: null,
        work_location: 'remote',
        skills: [
          'Corporate Governance',
          'Sustainable Business',
          'Food Industry',
          'Strategic Planning',
        ],
        languages: ['Danish', 'English', 'German'],
      },
      {
        client_id: client.id,
        person_code: 'assoc-002',
        first_name: 'Niels',
        last_name: 'Christiansen',
        company_email: 'niels.christiansen@board.hygge-hvidlog.dk',
        department: 'Board of Directors',
        position: 'Board Member',
        location: 'Aarhus, Denmark',
        associate_status: 'board_member',
        employment_status: null,
        start_date: '2022-06-01',
        employment_type: null,
        work_location: 'remote',
        skills: ['Finance', 'Investment', 'Venture Capital', 'Food Tech'],
        languages: ['Danish', 'English'],
      },

      // Strategic Advisors
      {
        client_id: client.id,
        person_code: 'assoc-003',
        first_name: 'Dr. Astrid',
        last_name: 'Møller',
        company_email: 'astrid.moller@advisors.hygge-hvidlog.dk',
        department: 'Strategic Advisory',
        position: 'Sustainability Advisor',
        location: 'Malmö, Sweden',
        associate_status: 'advisor',
        employment_status: null,
        start_date: '2023-03-01',
        employment_type: null,
        work_location: 'remote',
        skills: [
          'Sustainability',
          'Environmental Science',
          'Plant-based Nutrition',
          'EU Regulations',
        ],
        languages: ['Swedish', 'Danish', 'English', 'Norwegian'],
      },
      {
        client_id: client.id,
        person_code: 'assoc-004',
        first_name: 'Klaus',
        last_name: 'Petersen',
        company_email: 'klaus.petersen@advisors.hygge-hvidlog.dk',
        department: 'Strategic Advisory',
        position: 'Technology Advisor',
        location: 'Oslo, Norway',
        associate_status: 'advisor',
        employment_status: null,
        start_date: '2023-09-01',
        employment_type: null,
        work_location: 'hybrid',
        skills: ['Food Technology', 'Biotechnology', 'Innovation Management', 'R&D Strategy'],
        languages: ['Norwegian', 'English', 'Danish'],
      },

      // Consultants
      {
        client_id: client.id,
        person_code: 'assoc-005',
        first_name: 'Ingrid',
        last_name: 'Svendsen',
        company_email: 'ingrid.svendsen@consultants.hygge-hvidlog.dk',
        department: 'Marketing & Communications',
        position: 'Brand Consultant',
        location: 'Copenhagen, Denmark',
        associate_status: 'consultant',
        employment_status: null,
        start_date: '2024-01-15',
        employment_type: null,
        work_location: 'hybrid',
        skills: ['Brand Strategy', 'Digital Marketing', 'Sustainable Branding', 'Nordic Markets'],
        languages: ['Danish', 'English', 'Swedish'],
      },
      {
        client_id: client.id,
        person_code: 'assoc-006',
        first_name: 'Torben',
        last_name: 'Andreasen',
        company_email: 'torben.andreasen@consultants.hygge-hvidlog.dk',
        department: 'Operations',
        position: 'Supply Chain Consultant',
        location: 'Aalborg, Denmark',
        associate_status: 'consultant',
        employment_status: null,
        start_date: '2024-02-01',
        employment_type: null,
        work_location: 'remote',
        skills: ['Supply Chain', 'Logistics', 'Procurement', 'Sustainable Sourcing'],
        languages: ['Danish', 'English', 'Dutch'],
      },

      // External Contractors
      {
        client_id: client.id,
        person_code: 'assoc-007',
        first_name: 'Elena',
        last_name: 'Borg',
        company_email: 'elena.borg@contractors.hygge-hvidlog.dk',
        department: 'IT & Development',
        position: 'DevOps Contractor',
        location: 'Stockholm, Sweden',
        associate_status: 'contractor',
        employment_status: null,
        start_date: '2024-03-01',
        employment_type: null,
        work_location: 'remote',
        skills: ['DevOps', 'Cloud Infrastructure', 'Kubernetes', 'CI/CD', 'Security'],
        languages: ['Swedish', 'English', 'Finnish'],
      },
      {
        client_id: client.id,
        person_code: 'assoc-008',
        first_name: 'Jan',
        last_name: 'Vestergaard',
        company_email: 'jan.vestergaard@contractors.hygge-hvidlog.dk',
        department: 'Quality Assurance',
        position: 'Food Safety Contractor',
        location: 'Odense, Denmark',
        associate_status: 'contractor',
        employment_status: null,
        start_date: '2024-04-01',
        employment_type: null,
        work_location: 'office',
        skills: ['Food Safety', 'Quality Control', 'HACCP', 'EU Food Regulations'],
        languages: ['Danish', 'English', 'German'],
      },

      // Business Partners
      {
        client_id: client.id,
        person_code: 'assoc-009',
        first_name: 'Lise',
        last_name: 'Karlsson',
        company_email: 'lise.karlsson@partners.hygge-hvidlog.dk',
        department: 'Business Development',
        position: 'Strategic Partner Representative',
        location: 'Gothenburg, Sweden',
        associate_status: 'partner',
        employment_status: null,
        start_date: '2023-11-01',
        employment_type: null,
        work_location: 'hybrid',
        skills: ['Partnership Development', 'Business Development', 'Nordic Markets', 'Retail'],
        languages: ['Swedish', 'Danish', 'English', 'Norwegian'],
      },
      {
        client_id: client.id,
        person_code: 'assoc-010',
        first_name: 'Finn',
        last_name: 'Haugen',
        company_email: 'finn.haugen@partners.hygge-hvidlog.dk',
        department: 'Research & Development',
        position: 'Research Partner',
        location: 'Trondheim, Norway',
        associate_status: 'partner',
        employment_status: null,
        start_date: '2023-08-01',
        employment_type: null,
        work_location: 'remote',
        skills: ['Food Science', 'Research', 'Innovation', 'Academic Collaboration'],
        languages: ['Norwegian', 'English', 'Danish'],
      },
    ];

    console.log(chalk.yellow(`📝 Adding ${associatesData.length} associates...`));

    // Insert each associate
    let successCount = 0;
    for (const associate of associatesData) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/people`, {
          method: 'POST',
          headers: {
            ...headers,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(associate),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            chalk.red(
              `❌ Error adding ${associate.first_name} ${associate.last_name}: HTTP ${response.status} - ${errorText}`
            )
          );
        } else {
          console.log(
            chalk.green(
              `✅ Added ${associate.first_name} ${associate.last_name} (${associate.associate_status})`
            )
          );
          successCount++;
        }
      } catch (error) {
        console.error(
          chalk.red(
            `❌ Error adding ${associate.first_name} ${associate.last_name}:`,
            error.message
          )
        );
      }
    }

    // Summary
    console.log(chalk.blue('\n📊 Summary:'));
    console.log(chalk.green(`✅ Successfully added ${successCount} associates`));
    console.log(chalk.cyan('   • 2 Board Members'));
    console.log(chalk.cyan('   • 2 Strategic Advisors'));
    console.log(chalk.cyan('   • 2 Consultants'));
    console.log(chalk.cyan('   • 2 External Contractors'));
    console.log(chalk.cyan('   • 2 Business Partners'));

    // Verify the additions
    console.log(chalk.blue('\n🔍 Verifying associates...'));

    const verifyResponse = await fetch(
      `${supabaseUrl}/rest/v1/people?select=first_name,last_name,position,associate_status&client_id=eq.${client.id}&associate_status=not.is.null&order=associate_status,first_name`,
      {
        headers,
      }
    );

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error(
        chalk.red(`❌ Error verifying associates: HTTP ${verifyResponse.status} - ${errorText}`)
      );
      return;
    }

    const associates = await verifyResponse.json();

    if (associates && associates.length > 0) {
      console.log(chalk.green(`\n✅ Found ${associates.length} associates in database:`));

      const groupedAssociates = associates.reduce((groups, assoc) => {
        const status = assoc.associate_status;
        if (!groups[status]) groups[status] = [];
        groups[status].push(assoc);
        return groups;
      }, {});

      Object.entries(groupedAssociates).forEach(([status, people]) => {
        console.log(chalk.cyan(`\n   ${status.replace('_', ' ').toUpperCase()}:`));
        for (const person of people) {
          console.log(
            chalk.gray(`     • ${person.first_name} ${person.last_name} - ${person.position}`)
          );
        }
      });
    }

    console.log(chalk.green('\n🎉 Associate people successfully added to Hygge & Hvidløg!'));
  } catch (error) {
    console.error(chalk.red('❌ Unexpected error:'), error);
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addHyggeAssociates();
}

export { addHyggeAssociates };
