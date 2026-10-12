import 'package:flutter/material.dart';

class ComplaintTrackingScreen extends StatelessWidget {
  final int complaintId;
  const ComplaintTrackingScreen({super.key, required this.complaintId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Complaint Timeline'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20.0),
        children: [
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Complaint ID: CC-20260625-XP76',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  SizedBox(height: 8),
                  Text('Category: Roads & Potholes'),
                  Text('Status: In Progress', style: TextStyle(color: Colors.cyan)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text('Tracking Milestones', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildTimelineNode(
            title: 'Assigned to Investigation Officer',
            subtitle: 'Officer John Doe is reviewing the road erosion details.',
            time: '2026-06-25 11:20 AM',
            isDone: true,
            isCurrent: true,
          ),
          _buildTimelineNode(
            title: 'Department Assigned',
            subtitle: 'Automatically routed to PWD Roads and Potholes Department.',
            time: '2026-06-25 11:15 AM',
            isDone: true,
            isCurrent: false,
          ),
          _buildTimelineNode(
            title: 'Grievance Submitted',
            subtitle: 'Filed successfully via Android app. AI verified coordinates.',
            time: '2026-06-25 11:05 AM',
            isDone: true,
            isCurrent: false,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineNode({
    required String title,
    required String subtitle,
    required String time,
    required bool isDone,
    required bool isCurrent,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: isCurrent ? Colors.cyan : (isDone ? Colors.blueAccent : Colors.grey),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white10, width: 2),
              ),
            ),
            Container(
              width: 2,
              height: 60,
              color: Colors.white10,
            ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isCurrent ? Colors.cyan : Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(subtitle, style: const TextStyle(fontSize: 13, color: Colors.grey)),
              const SizedBox(height: 4),
              Text(time, style: const TextStyle(fontSize: 11, color: Colors.blueGrey)),
            ],
          ),
        ),
      ],
    );
  }
}
