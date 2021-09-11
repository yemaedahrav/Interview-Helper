import TextEditor from "./TextEditor"
import Call from "./Call"
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom"
import { v4 as uuidV4 } from "uuid"
import Login from "./Login"
import Register from "./Register"
import Reset from "./Reset"
import Logout from "./Logout"

function App() {
  return (
    <div className="app">
      <Router>
        <Switch>
          <Route exact path="/" component={Login} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/reset" component={Reset} />
          <Route exact path="/dashboard">
            <Redirect to = {`/documents/${uuidV4()}`} />
          </Route>
          <Route path = "/documents/:id">
          <TextEditor />
          <Call />
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App
