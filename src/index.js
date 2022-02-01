const express = require('express');
const { v4: uuidv4 } = require('uuid')
const app = express();

const customers = [];

app.use(express.json());

// middleware
function verifyIfAccountExists(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find(customer => customer.cpf == cpf);

    if (!customer) {
        return response.status(404).json({
            error: 'Customer not found!'
        });
    }

    request.customer = customer;

    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((acc, transaction) => {
        if (transaction.type === 'credit') {
            return acc + transaction.amount;
        } else {
            return acc - transaction.amount;
        }
    }, 0);

    return balance;
}

function convertDate(date) {
    const dateFormat = date.split('/');
    const convertedDate = `${dateFormat[1]}/${dateFormat[0]}/${dateFormat[2]} 00:00`;
    return convertedDate;
}

app.post('/account', (request, response) => {
    const { cpf, name } = request.body;
    const customerAlreadyExists = customers.some(customer => customer.cpf == cpf);

    if (customerAlreadyExists) {
        return response.status(400).json({
            error: 'Customer already exists!'
        });
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    return response.status(201).send();
});

app.get('/account', verifyIfAccountExists, (request, response) => {
    const { customer } = request;

    return response.json(customer);
});

app.get('/statement', verifyIfAccountExists, (request, response) => {
    const { customer } = request;

    return response.json(customer.statement);
});

app.get('/balance', verifyIfAccountExists, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.status(200).json({ balance });
})

app.get('/statement/date', verifyIfAccountExists, (request, response) => {
    let { date } = request.query;
    const { customer } = request;

    const convertedDate = convertDate(date);
    const formatedDate = new Date(convertedDate);

    const statement = customer.statement.filter(
        transaction => transaction.created_at.toDateString() == formatedDate.toDateString()
    );

    return response.json(statement);
});

app.post('/deposit', verifyIfAccountExists, (request, response) => {
    const { description, amount } = request.body;
    const { customer } = request;

    const depositOperation = {
        description,
        amount,
        created_at: new Date(),
        type: 'credit'
    }

    customer.statement.push(depositOperation);

    return response.status(201).end();
});

app.post('/withdraw', verifyIfAccountExists, (request, response) => {
    const { description, amount } = request.body;
    const { customer } = request;

    if (customer.statement.length === 0) {
        return response.status(400).json({
            error: 'Insufficient funds!'
        })
    }

    const balance = getBalance(customer.statement);

    if (balance < amount) {
        return response.status(400).json({
            error: 'Insufficient funds!'
        });
    }

    const withdrawOperation = {
        description,
        amount,
        created_at: new Date(),
        type: 'withdraw'
    };

    customer.statement.push(withdrawOperation);

    return response.status(200).end();
});

app.put('/account', verifyIfAccountExists, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(200).end();
});

app.delete('/account', verifyIfAccountExists, (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
})

app.listen(3333);
