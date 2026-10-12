import 'package:flutter/material.dart';
import 'submit_complaint.dart';
import 'tracking.dart';

class CitizenDashboard extends StatefulWidget {
  const CitizenDashboard({super.key});

  @override
  State<CitizenDashboard> createState() => _CitizenDashboardState();
}

class _CitizenDashboardState extends State<CitizenDashboard> {
  // Mock data of complaints
  final List<Map<String, dynamic>> _mockComplaints = [
    {
      "id": 1,
      "unique_id": "CC-20260625-XP76",
      "title": "Pothole in middle of Main Road",
      "category": "Roads & Potholes",
      "priority": "High",
      "status": "In Progress"
    },
    {
      "id": 2,
      "unique_id": "CC-20260624-AQ43",
      "title": "Blocked drainage causing minor leakages",
      "category": "Drainage Problems",
      "priority": "Medium",
      "status": "Pending"
    },
    {
      "id": 3,
      "unique_id": "CC-20260620-PL99",
      "title": "Streetlight Flickering and Dim",
      "category": "Streetlight Failure",
      "priority": "Low",
      "status": "Resolved"
    }
  ];

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Resolved': return Colors.emerald;
      case 'In Progress': return Colors.cyan;
      default: return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Citizen Hub', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Metrics Row
            Row(
              children: [
                Expanded(child: _buildMetricCard('Total Filed', '3', Colors.blue)),
                const SizedBox(width: 8),
                Expanded(child: _buildMetricCard('Active', '2', Colors.orange)),
                const SizedBox(width: 8),
                Expanded(child: _buildMetricCard('Resolved', '1', Colors.emerald)),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'Submitted Grievances',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _mockComplaints.length,
              itemBuilder: (context, index) {
                final c = _mockComplaints[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    title: Text(c['title'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text('ID: ${c['unique_id']} • ${c['category']}'),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white10,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Priority: ${c['priority']}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Chip(
                          label: Text(c['status'], style: const TextStyle(color: Colors.white, fontSize: 12)),
                          backgroundColor: _getStatusColor(c['status']),
                          side: BorderSide.none,
                          padding: EdgeInsets.zero,
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                          onPressed: () => _confirmDelete(context, index),
                        ),
                      ],
                    ),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ComplaintTrackingScreen(complaintId: c['id']),
                        ),
                      );
                    },
                  ),
                );
              },
            )
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SubmitComplaintScreen()),
          );
        },
        backgroundColor: Colors.blueAccent,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('File Complaint', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, int index) {
    showDialog(
      context: context,
      builder: (BuildContext ctx) {
        return AlertDialog(
          title: const Text('Delete Complaint'),
          content: const Text('Are you sure you want to delete this complaint? This action cannot be undone.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  _mockComplaints.removeAt(index);
                });
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Complaint deleted successfully')),
                );
              },
              child: const Text('Delete', style: TextStyle(color: Colors.redAccent)),
            ),
          ],
        );
      },
    );
  }
}
