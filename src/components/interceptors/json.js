import { isObject } from '../../utils';
import { nativeJSONParse } from './natives';

// Intercept, inspect and modify JSON-based communication to unlock player responses by hijacking the JSON.parse function
export default function attach(onJsonDataReceived) {
    window.JSON.parse = function() {
        const data = nativeJSONParse.apply(this, arguments);
        return isObject(data) ? onJsonDataReceived(data) : data;
    };
}
