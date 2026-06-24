import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/attendance_provider.dart';
import 'providers/geofence_provider.dart';
import 'providers/leave_provider.dart';
import 'screens/splash_screen.dart';
import 'services/api_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  final api = ApiService();
  const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(api, storage)),
        ChangeNotifierProvider(create: (_) => AttendanceProvider(api)),
        ChangeNotifierProvider(create: (_) => GeofenceProvider(api)),
        ChangeNotifierProvider(create: (_) => LeaveProvider(api)),
      ],
      child: const PFAAttendanceApp(),
    ),
  );
}

class PFAAttendanceApp extends StatelessWidget {
  const PFAAttendanceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PFA Attendance',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF006B3F),
          primary: const Color(0xFF006B3F),
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}
