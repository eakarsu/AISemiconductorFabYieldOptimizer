import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCpu } from 'react-icons/fi';

function Navbar({ title }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          <FiArrowLeft size={18} /> Dashboard
        </button>
      </div>
      <div className="navbar-center">
        <FiCpu size={20} className="navbar-logo" />
        <h2>{title}</h2>
      </div>
      <div className="navbar-right" />
    </nav>
  );
}

export default Navbar;
