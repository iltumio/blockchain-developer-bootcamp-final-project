import "./App.css";
import { Route, Routes } from "react-router";
import { HomePage } from "./pages/home/HomePage";
import { Header } from "./components/header/Header";

function App() {
  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  );
}

export default App;
