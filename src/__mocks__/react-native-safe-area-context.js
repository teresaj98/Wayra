/**
 * Jest mock for react-native-safe-area-context: the library's own mock, as its
 * README documents. Without it SafeAreaProvider renders nothing in Jest because
 * native insets never arrive. Plain CommonJS because the mock is one object.
 */
module.exports = require('react-native-safe-area-context/jest/mock').default;
