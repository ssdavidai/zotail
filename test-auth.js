const { getAuthURL } = require('./lib/interactive-auth');

getAuthURL().then(url => {
  if (url) {
    console.log('✓ Got auth URL:', url);
  } else {
    console.log('✗ No auth URL found');
  }
}).catch(err => {
  console.error('Error:', err.message);
});
