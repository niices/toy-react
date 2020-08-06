import { ToyReact, Component } from "./ToyReact.js";

class MyComponent extends Component {
  render() {
    return <div>hello world</div>;
  }
}

let demo = <MyComponent></MyComponent>;

ToyReact.render(demo, document.body);
