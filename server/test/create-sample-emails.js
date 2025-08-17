import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Exemples d'emails réels basés sur les parsers existants
const sampleEmails = [
  {
    id: 'sample_assurprospect_001',
    subject: 'Nouvelle demande de devis mutuelle santé',
    from: 'contact@assurprospect.fr',
    date: new Date().toISOString(),
    htmlContent: `
      <html>
        <body>
          <h2>Nouvelle demande de devis mutuelle santé</h2>
          <p><strong>Souscripteur :</strong></p>
          <ul>
            <li>Nom : DUPONT</li>
            <li>Prénom : Jean</li>
            <li>Date de naissance : 15/03/1985</li>
            <li>Email : jean.dupont@email.com</li>
            <li>Téléphone : 0612345678</li>
            <li>Code postal : 75012</li>
            <li>Ville : Paris</li>
          </ul>
          <p><strong>Conjoint :</strong></p>
          <ul>
            <li>Nom : DUPONT</li>
            <li>Prénom : Marie</li>
            <li>Date de naissance : 22/07/1987</li>
          </ul>
          <p><strong>Enfants :</strong></p>
          <ul>
            <li>Enfant 1 : Né(e) le 10/05/2015</li>
            <li>Enfant 2 : Né(e) le 18/09/2018</li>
          </ul>
          <p><strong>Besoins :</strong></p>
          <p>Recherche une mutuelle familiale avec bonne couverture optique et dentaire.</p>
          <p><strong>Régime actuel :</strong> Salarié</p>
          <p><strong>Mutuelle actuelle :</strong> Harmonie Mutuelle - 150€/mois</p>
        </body>
      </html>
    `,
    textContent: `Nouvelle demande de devis mutuelle santé
    
Souscripteur :
- Nom : DUPONT
- Prénom : Jean
- Date de naissance : 15/03/1985
- Email : jean.dupont@email.com
- Téléphone : 0612345678
- Code postal : 75012
- Ville : Paris

Conjoint :
- Nom : DUPONT
- Prénom : Marie
- Date de naissance : 22/07/1987

Enfants :
- Enfant 1 : Né(e) le 10/05/2015
- Enfant 2 : Né(e) le 18/09/2018

Besoins :
Recherche une mutuelle familiale avec bonne couverture optique et dentaire.

Régime actuel : Salarié
Mutuelle actuelle : Harmonie Mutuelle - 150€/mois`
  },
  {
    id: 'sample_assurlead_002',
    subject: 'Lead Mutuelle Santé - Urgent',
    from: 'leads@assurlead.fr',
    date: new Date(Date.now() - 86400000).toISOString(), // Hier
    htmlContent: `
      <html>
        <body>
          <div style="font-family: Arial, sans-serif;">
            <h3>Nouveau lead Assurlead</h3>
            <table border="1" cellpadding="5">
              <tr><td><b>Type de demande</b></td><td>Mutuelle Santé Senior</td></tr>
              <tr><td><b>Nom</b></td><td>MARTIN</td></tr>
              <tr><td><b>Prénom</b></td><td>Robert</td></tr>
              <tr><td><b>Date de naissance</b></td><td>12/01/1955</td></tr>
              <tr><td><b>Email</b></td><td>robert.martin@gmail.com</td></tr>
              <tr><td><b>Téléphone</b></td><td>06 98 76 54 32</td></tr>
              <tr><td><b>Adresse</b></td><td>15 rue de la République</td></tr>
              <tr><td><b>Code postal</b></td><td>69002</td></tr>
              <tr><td><b>Ville</b></td><td>Lyon</td></tr>
              <tr><td><b>Situation</b></td><td>Retraité</td></tr>
              <tr><td><b>Budget mensuel</b></td><td>80-120€</td></tr>
              <tr><td><b>Besoins spécifiques</b></td><td>Couverture hospitalisation, soins courants</td></tr>
            </table>
          </div>
        </body>
      </html>
    `,
    textContent: `Nouveau lead Assurlead

Type de demande: Mutuelle Santé Senior
Nom: MARTIN
Prénom: Robert
Date de naissance: 12/01/1955
Email: robert.martin@gmail.com
Téléphone: 06 98 76 54 32
Adresse: 15 rue de la République
Code postal: 69002
Ville: Lyon
Situation: Retraité
Budget mensuel: 80-120€
Besoins spécifiques: Couverture hospitalisation, soins courants`
  },
  {
    id: 'sample_generic_003',
    subject: 'Demande de contact - Mutuelle entreprise',
    from: 'contact@entreprise-conseil.fr',
    date: new Date(Date.now() - 172800000).toISOString(), // Il y a 2 jours
    htmlContent: `
      <html>
        <body>
          <p>Bonjour,</p>
          <p>Je vous contacte pour une demande de devis mutuelle entreprise.</p>
          <br>
          <p>Informations de contact :</p>
          <p>Société : Tech Solutions SARL<br>
          Contact : Mme Sophie BERNARD<br>
          Fonction : DRH<br>
          Email : s.bernard@techsolutions.fr<br>
          Téléphone : 01 45 67 89 00<br>
          Mobile : 06 11 22 33 44<br>
          Nombre de salariés : 25<br>
          Secteur : Informatique<br>
          Adresse : 100 avenue des Champs-Élysées, 75008 Paris</p>
          <br>
          <p>Nous recherchons une mutuelle collective pour nos salariés avec des garanties renforcées.</p>
          <p>Budget annuel estimé : 30 000€</p>
          <p>Mise en place souhaitée : Janvier 2024</p>
          <br>
          <p>Cordialement,<br>
          Sophie Bernard</p>
        </body>
      </html>
    `,
    textContent: `Bonjour,

Je vous contacte pour une demande de devis mutuelle entreprise.

Informations de contact :
Société : Tech Solutions SARL
Contact : Mme Sophie BERNARD
Fonction : DRH
Email : s.bernard@techsolutions.fr
Téléphone : 01 45 67 89 00
Mobile : 06 11 22 33 44
Nombre de salariés : 25
Secteur : Informatique
Adresse : 100 avenue des Champs-Élysées, 75008 Paris

Nous recherchons une mutuelle collective pour nos salariés avec des garanties renforcées.
Budget annuel estimé : 30 000€
Mise en place souhaitée : Janvier 2024

Cordialement,
Sophie Bernard`
  },
  {
    id: 'sample_multiple_leads_004',
    subject: 'Transmission de 2 prospects mutuelles',
    from: 'partenaire@assurances.com',
    date: new Date(Date.now() - 259200000).toISOString(), // Il y a 3 jours
    htmlContent: `
      <html>
        <body>
          <h3>Prospect 1:</h3>
          <p>
            Nom: LEROY<br>
            Prénom: Pierre<br>
            Né le: 05/06/1992<br>
            Tel: 0677889900<br>
            Email: p.leroy@outlook.fr<br>
            CP: 13001<br>
            Ville: Marseille<br>
            Célibataire sans enfant<br>
            Recherche: Mutuelle individuelle basique
          </p>
          
          <hr>
          
          <h3>Prospect 2:</h3>
          <p>
            Nom: GARCIA<br>
            Prénom: Maria<br>
            Née le: 18/11/1978<br>
            Tel: 06.55.44.33.22<br>
            Email: maria.garcia@yahoo.fr<br>
            CP: 31000<br>
            Ville: Toulouse<br>
            Mariée, 3 enfants (2008, 2012, 2016)<br>
            Mutuelle actuelle: MAIF<br>
            Budget: 200€/mois maximum<br>
            Besoins: Orthodontie enfants
          </p>
        </body>
      </html>
    `,
    textContent: `Prospect 1:
Nom: LEROY
Prénom: Pierre
Né le: 05/06/1992
Tel: 0677889900
Email: p.leroy@outlook.fr
CP: 13001
Ville: Marseille
Célibataire sans enfant
Recherche: Mutuelle individuelle basique

---

Prospect 2:
Nom: GARCIA
Prénom: Maria
Née le: 18/11/1978
Tel: 06.55.44.33.22
Email: maria.garcia@yahoo.fr
CP: 31000
Ville: Toulouse
Mariée, 3 enfants (2008, 2012, 2016)
Mutuelle actuelle: MAIF
Budget: 200€/mois maximum
Besoins: Orthodontie enfants`
  },
  {
    id: 'sample_no_lead_005',
    subject: 'Re: Votre proposition commerciale',
    from: 'noreply@example.com',
    date: new Date().toISOString(),
    htmlContent: `
      <html>
        <body>
          <p>Bonjour,</p>
          <p>Merci pour votre proposition, nous allons l'étudier et revenir vers vous.</p>
          <p>Cordialement,</p>
          <p>Service Commercial</p>
        </body>
      </html>
    `,
    textContent: `Bonjour,

Merci pour votre proposition, nous allons l'étudier et revenir vers vous.

Cordialement,
Service Commercial`
  }
];

async function createSampleEmails() {
  console.log('📧 Création des emails d\'exemple...\n');
  
  // Créer le dossier mails s'il n'existe pas
  await fs.mkdir(config.outputDir, { recursive: true });
  
  const savedFiles = [];
  
  for (const email of sampleEmails) {
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    const baseFileName = `email_${timestamp}_${email.id}`;
    
    // Créer la structure Gmail API
    const gmailPayload = {
      headers: [
        { name: 'Subject', value: email.subject },
        { name: 'From', value: email.from },
        { name: 'Date', value: email.date },
        { name: 'To', value: 'vous@votreentreprise.com' }
      ],
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            data: Buffer.from(email.textContent).toString('base64')
          }
        },
        {
          mimeType: 'text/html',
          body: {
            data: Buffer.from(email.htmlContent).toString('base64')
          }
        }
      ]
    };
    
    const fullData = {
      metadata: {
        id: email.id,
        threadId: `thread_${email.id}`,
        timestamp,
        fetchedAt: new Date().toISOString(),
        subject: email.subject,
        from: email.from,
        to: 'vous@votreentreprise.com',
        date: email.date,
        labels: ['INBOX', 'UNREAD']
      },
      payload: gmailPayload,
      snippet: email.textContent.substring(0, 100),
      sizeEstimate: email.textContent.length + email.htmlContent.length,
      historyId: Math.floor(Math.random() * 1000000).toString(),
      internalDate: Date.parse(email.date).toString()
    };
    
    // Sauvegarder le JSON
    const jsonPath = path.join(config.outputDir, `${baseFileName}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(fullData, null, 2), 'utf-8');
    
    // Sauvegarder le HTML
    const htmlPath = path.join(config.outputDir, `${baseFileName}.html`);
    await fs.writeFile(htmlPath, email.htmlContent, 'utf-8');
    
    console.log(`✅ Créé: ${baseFileName}.json et .html`);
    savedFiles.push({
      messageId: email.id,
      jsonFile: `${baseFileName}.json`,
      htmlFile: `${baseFileName}.html`,
      metadata: fullData.metadata
    });
  }
  
  // Créer le résumé
  const summary = {
    fetchDate: new Date().toISOString(),
    config: {
      days: 7,
      maxResults: sampleEmails.length,
      query: 'SAMPLE DATA'
    },
    totalEmails: savedFiles.length,
    emails: savedFiles.map(f => ({
      id: f.messageId,
      subject: f.metadata.subject,
      from: f.metadata.from,
      date: f.metadata.date,
      files: {
        json: f.jsonFile,
        html: f.htmlFile
      }
    }))
  };
  
  const summaryPath = path.join(config.outputDir, 'fetch-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  
  console.log(`\n📊 ${savedFiles.length} emails d'exemple créés avec succès!`);
  console.log('📁 Fichiers dans:', config.outputDir);
  
  return savedFiles;
}

// Exécution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createSampleEmails()
    .then(() => {
      console.log('\n✨ Terminé! Vous pouvez maintenant lancer: npm run parse');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

export { createSampleEmails };