import React from 'react';
import { useEffect } from 'react';
import initAds from './services/adInit';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Feed from './screens/Feed';
import SignIn from './screens/Auth/SignIn';
import SignUp from './screens/Auth/SignUp';
import Profile from './screens/Profile';
import Creator from './screens/Creator';
import Upload from './screens/Upload';
import AdTest from './screens/AdTest';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Feed" component={Feed} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();
  if (initializing) return null; // simple splash placeholder

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignIn} />
          <Stack.Screen name="SignUp" component={SignUp} />
        </>
      )}
      <Stack.Screen name="Creator" component={Creator} />
      <Stack.Screen name="Upload" component={Upload} />
      <Stack.Screen name="AdTest" component={AdTest} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // initialize native ad SDKs if available (no-op in pure web/dev without native modules)
    initAds().catch((e) => console.log('initAds error', e));
  }, []);
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
