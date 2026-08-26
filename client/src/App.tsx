import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DocumentList from "./components/DocumentList/DocumentList";
import Editor from "./pages/Editor/Editor";
import NewDocument from "./components/NewDocument/NewDocument";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default */}
        <Route
          path="/"
          element={<Navigate to="/documents" replace />}
        />

        {/* Documents */}
        <Route
          path="/documents"
          element={<DocumentList />}
        />

        {/* New Document */}
        <Route
          path="/documents/new"
          element={<NewDocument />}
        />

        {/* Editor */}
        <Route
          path="/edit/:id"
          element={<Editor />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;