import React from 'react';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Home from './components/Home/Home';

import './App.css';

function App() {
  return (
    <div className="App">
      <Header />
      <Home />
      <Footer/>
    </div>
  );
}

export default App;