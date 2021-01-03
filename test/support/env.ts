// Helper module to inject utilities onto the `window` Object.
// Meant for improved debugging of the test suites.
import {
  HOSTNAME,
  graphqlOperation,
} from '../graphql-api/utils/executeOperation'

// @ts-ignore
window.graphqlOperation = graphqlOperation(HOSTNAME)
