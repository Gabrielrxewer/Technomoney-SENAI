import React, { useState, useEffect } from "react";
import StocksHome from "./StocksHome/StocksHome";
import Spinner from "../Spinner/Spinner"; 

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 100); 
  }, []);

  return (
    <div className="dashboard-container">
      {isLoading ? (
        <div className="loading-screen">
          <Spinner />
        </div>
      ) : (
        <StocksHome />
      )}
    </div>
  );
}
