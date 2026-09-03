import 'react-native-gesture-handler';
import '../data/cryptoShim';   // WebCrypto p/ o PKCE do supabase-js — antes do cliente nascer
import { registerRootComponent } from 'expo';
import App from '../App';
registerRootComponent(App);
