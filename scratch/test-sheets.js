const dotenv = require('dotenv');
dotenv.config({ path: '/Volumes/akshat/Lead/.env' });

const { fetchAllLeads } = require('./dashboard/lib/sheets');

fetchAllLeads()
  .then(leads => console.log('Loaded leads:', leads.length))
  .catch(err => console.error('ERROR:', err));
