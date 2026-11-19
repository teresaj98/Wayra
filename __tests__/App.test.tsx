import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('S1 placeholder renders the app name and the build environment', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const env = renderer!.root.findByProps({ testID: 'placeholder-env' });
  expect(env.props.children).toEqual(['Environment: ', 'staging']);
});
