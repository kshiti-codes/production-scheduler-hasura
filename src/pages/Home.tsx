import React from 'react';
import ExampleComponent from '../components/ExampleComponent';

const Home: React.FC = () => {
    return (
        <div>
            <h1>Welcome to the Production Scheduler</h1>
            <p>This is the home page of the application.</p>
            <ExampleComponent />
        </div>
    );
};

export default Home;