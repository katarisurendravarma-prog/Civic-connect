import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

class SubmitComplaintScreen extends StatefulWidget {
  const SubmitComplaintScreen({super.key});

  @override
  State<SubmitComplaintScreen> createState() => _SubmitComplaintScreenState();
}

class _SubmitComplaintScreenState extends State<SubmitComplaintScreen> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _addressController = TextEditingController();
  String _selectedCategory = 'Detect Automatically';
  String _gpsCoordinates = 'Fetching location...';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _updateLocation();
  }

  final List<String> _categories = [
    'Detect Automatically',
    'Roads & Potholes',
    'Garbage Management',
    'Water Supply Issues',
    'Drainage Problems',
    'Sewage Issues',
    'Streetlight Failure',
    'Electricity Problems',
    'Public Property Damage',
    'Traffic Signal Issues',
    'Environmental Issues'
  ];

  Future<void> _updateLocation() async {
    setState(() {
      _gpsCoordinates = 'Fetching location...';
    });

    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => _gpsCoordinates = 'Location services are disabled.');
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        setState(() => _gpsCoordinates = 'Location permissions are denied.');
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      setState(() => _gpsCoordinates = 'Location permissions are permanently denied.');
      return;
    } 

    try {
      Position position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 5),
        );
      } catch (_) {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 10),
        );
      }
      setState(() {
        _gpsCoordinates = 'Latitude: ${position.latitude.toStringAsFixed(5)}, Longitude: ${position.longitude.toStringAsFixed(5)}';
      });
    } catch (e) {
      final lastPos = await Geolocator.getLastKnownPosition();
      if (lastPos != null) {
        setState(() {
          _gpsCoordinates = 'Latitude: ${lastPos.latitude.toStringAsFixed(5)}, Longitude: ${lastPos.longitude.toStringAsFixed(5)} (Cached)';
        });
      } else {
        setState(() => _gpsCoordinates = 'Failed to get location. Enter address manually.');
      }
    }
  }

  void _submit() async {
    setState(() { _isLoading = true; });
    
    // Simulate endpoint registration delay
    await Future.delayed(const Duration(seconds: 1));
    
    if (!mounted) return;
    
    setState(() { _isLoading = false; });
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Complaint filed successfully! Tracking ID generated.'),
        backgroundColor: Colors.emerald,
      ),
    );
    
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('File Complaint'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'Short Title',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'Complaint Description',
                hintText: 'State issue details clearly. AI will auto-categorize.',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedCategory,
              decoration: InputDecoration(
                labelText: 'Issue Category',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              items: _categories.map((c) {
                return DropdownMenuItem(value: c, child: Text(c));
              }).toList(),
              onChanged: (val) {
                if (val != null) {
                  setState(() { _selectedCategory = val; });
                }
              },
            ),
            const SizedBox(height: 24),
            
            // Geotagging GPS Widget
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: Colors.blueAccent, size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('GPS Geotagging', style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(_gpsCoordinates, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: _updateLocation,
                        child: const Text('Update'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _addressController,
                          decoration: InputDecoration(
                            labelText: 'Or type address manually',
                            hintText: 'Enter full address here',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () {
                          if (_addressController.text.isNotEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Manual address set for this complaint.'),
                                backgroundColor: Colors.blueAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueAccent,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Set'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      backgroundColor: Colors.blueAccent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text(
                      'Submit Grievance',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}
