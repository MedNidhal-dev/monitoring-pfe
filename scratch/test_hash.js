const bcrypt = require('bcryptjs');

const password = 'devops123';
const hash = '$2a$10$fWJ8I5h/M9n.i5Z3j9fMSu2L9FjRj4j6oB/2E8Xq4Y5o6P8Q9S.K.';

bcrypt.compare(password, hash, (err, res) => {
    console.log('Match:', res);
});

bcrypt.hash(password, 10, (err, newHash) => {
    console.log('New Hash:', newHash);
});
