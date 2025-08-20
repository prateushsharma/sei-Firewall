import os
import json
import numpy as np
import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from collections import defaultdict
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import LocalOutlierFactor
import community as community_louvain  # python-louvain package
import warnings
warnings.filterwarnings('ignore')

class PoolingDetector:
    def __init__(self, transfers):
        self.transfers = transfers
        self.results = {}
        
    def analyze_transaction_patterns(self):
        """Analyze transaction patterns for wash trading signs"""
        save_to_txt("🔍 Analyzing transaction patterns...")
        
        patterns = {
            'circular_trades': [],
            'rapid_back_forth': [],
            'same_address_pairs': [],
            'amount_clustering': self.detect_amount_clustering(),
            'suspicious_addresses': []
        }
        
        # Build transaction flow data
        address_flow = defaultdict(lambda: defaultdict(float))
        transaction_pairs = []
        
        for i, transfer in enumerate(self.transfers):
            sender = transfer['from']['address_hash']
            receiver = transfer['to']['address_hash']
            amount = float(transfer['amount'])
            timestamp = pd.to_datetime(transfer['timestamp'])
            
            address_flow[sender][receiver] += amount
            transaction_pairs.append((sender, receiver, amount, timestamp, i))
            
            # Check for immediate back-and-forth
            if i > 0:
                prev = self.transfers[i-1]
                if (prev['to']['address_hash'] == sender and 
                    prev['from']['address_hash'] == receiver):
                    time_diff = (timestamp - pd.to_datetime(prev['timestamp'])).total_seconds()
                    if time_diff < 3600:  # Within 1 hour
                        patterns['rapid_back_forth'].append({
                            'tx1': prev['tx_hash'],
                            'tx2': transfer['tx_hash'],
                            'time_diff_seconds': float(time_diff),
                            'amount': float(amount)
                        })
        
        # Detect circular patterns (A->B->C->A)
        patterns['circular_trades'] = self.detect_circular_trades(transaction_pairs)
        
        # Find address pairs with high frequency trading
        pair_counts = defaultdict(int)
        for sender, receiver, _, _, _ in transaction_pairs:
            pair_counts[(sender, receiver)] += 1
        
        suspicious_addresses = set()
        for pair, count in pair_counts.items():
            if count > 10:  # More than 10 transactions between same pair
                patterns['same_address_pairs'].append({
                    'sender': pair[0],
                    'receiver': pair[1],
                    'transaction_count': count
                })
                suspicious_addresses.update([pair[0], pair[1]])
        
        patterns['suspicious_addresses'] = list(suspicious_addresses)
        
        self.results['patterns'] = patterns
        return patterns
    
    def detect_circular_trades(self, transaction_pairs):
        """Detect circular trading patterns"""
        circular_trades = []
        G = nx.DiGraph()
        
        for sender, receiver, amount, timestamp, idx in transaction_pairs:
            G.add_edge(sender, receiver, weight=amount, timestamp=timestamp, index=idx)
        
        # Look for cycles of length 2-4
        try:
            cycles = list(nx.simple_cycles(G))
            for cycle in cycles:
                if 2 <= len(cycle) <= 4:
                    circular_trades.append({
                        'cycle': cycle,
                        'length': len(cycle)
                    })
        except:
            pass  # NetworkX might fail on large graphs
        
        return circular_trades
    
    def detect_amount_clustering(self):
        """Detect suspicious amount clustering"""
        amounts = [float(t['amount']) for t in self.transfers]
        
        # Check for repeated identical amounts
        amount_counts = {}
        for amount in amounts:
            amount_counts[amount] = amount_counts.get(amount, 0) + 1
        
        suspicious_amounts = {str(amt): int(cnt) for amt, cnt in amount_counts.items() 
                             if cnt > 5 and amt > 0}  # More than 5 occurrences
        
        return suspicious_amounts
    
    def detect_time_anomalies(self):
        """Detect anomalous timing patterns"""
        save_to_txt("⏰ Analyzing time anomalies...")
        
        timestamps = []
        amounts = []
        
        for transfer in self.transfers:
            ts = pd.to_datetime(transfer['timestamp'])
            timestamps.append(ts.timestamp())
            amounts.append(float(transfer['amount']))
        
        # Normalize features
        features = np.column_stack([
            (np.array(timestamps) - np.min(timestamps)) / max(1, np.max(timestamps) - np.min(timestamps)),
            (np.array(amounts) - np.min(amounts)) / max(1, np.max(amounts) - np.min(amounts))
        ])
        
        # Multiple anomaly detection methods
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        lof = LocalOutlierFactor(n_neighbors=20, contamination=0.1)
        
        iso_anomalies = iso_forest.fit_predict(features)
        lof_anomalies = lof.fit_predict(features)
        
        # Combine results
        combined_anomalies = []
        for i, (iso, lof) in enumerate(zip(iso_anomalies, lof_anomalies)):
            if iso == -1 or lof == -1:
                combined_anomalies.append({
                    'index': int(i),
                    'timestamp': str(self.transfers[i]['timestamp']),
                    'amount': float(amounts[i]),
                    'is_iso_anomaly': bool(iso == -1),
                    'is_lof_anomaly': bool(lof == -1)
                })
        
        self.results['time_anomalies'] = combined_anomalies
        return combined_anomalies
    
    def analyze_transfer_network(self):
        """Build and analyze transfer network graph"""
        save_to_txt("🌐 Analyzing transfer network...")
        
        G = nx.DiGraph()
        
        for transfer in self.transfers:
            sender = transfer['from']['address_hash']
            receiver = transfer['to']['address_hash']
            amount = float(transfer['amount'])
            
            if G.has_edge(sender, receiver):
                G[sender][receiver]['weight'] += amount
                G[sender][receiver]['count'] += 1
            else:
                G.add_edge(sender, receiver, weight=amount, count=1)
        
        # Calculate network metrics
        try:
            degree_centrality = nx.degree_centrality(G)
            betweenness_centrality = nx.betweenness_centrality(G)
            pagerank = nx.pagerank(G, weight='weight')
            
            # Detect communities
            undirected_G = G.to_undirected()
            partition = community_louvain.best_partition(undirected_G)
            
            # Convert numpy values to Python native types for JSON serialization
            network_metrics = {
                'nodes': int(G.number_of_nodes()),
                'edges': int(G.number_of_edges()),
                'degree_centrality': {k: float(v) for k, v in degree_centrality.items()},
                'betweenness_centrality': {k: float(v) for k, v in betweenness_centrality.items()},
                'pagerank': {k: float(v) for k, v in pagerank.items()},
                'communities': int(len(set(partition.values()))),
                'partition': {k: int(v) for k, v in partition.items()}
            }
            
        except Exception as e:
            save_to_txt(f"Network analysis error: {e}")
            network_metrics = {'error': str(e)}
        
        self.results['network_metrics'] = network_metrics
        return network_metrics
    
    def analyze_volume_patterns(self, time_window_hours=6):
        """Analyze volume patterns over time windows"""
        save_to_txt("📊 Analyzing volume patterns...")
        
        time_buckets = defaultdict(list)
        
        for transfer in self.transfers:
            ts = pd.to_datetime(transfer['timestamp'])
            bucket_key = ts.floor(f'{time_window_hours}H')
            time_buckets[bucket_key].append(float(transfer['amount']))
        
        # Calculate statistics per bucket
        bucket_stats = {}
        for bucket, amounts in time_buckets.items():
            bucket_stats[str(bucket)] = {
                'total_volume': float(sum(amounts)),
                'avg_volume': float(np.mean(amounts)) if amounts else 0.0,
                'max_volume': float(np.max(amounts)) if amounts else 0.0,
                'transaction_count': int(len(amounts)),
                'volume_variance': float(np.var(amounts)) if amounts else 0.0
            }
        
        # Detect anomalous buckets
        volumes = [stats['total_volume'] for stats in bucket_stats.values()]
        anomalous_buckets = {}
        if volumes:
            mean_vol = float(np.mean(volumes))
            std_vol = float(np.std(volumes))
            
            for bucket, stats in bucket_stats.items():
                if stats['total_volume'] > mean_vol + 2 * std_vol:
                    anomalous_buckets[bucket] = stats
        
        self.results['volume_analysis'] = {
            'bucket_stats': bucket_stats,
            'anomalous_buckets': anomalous_buckets
        }
        
        return bucket_stats, anomalous_buckets
    
    def cluster_address_behavior(self):
        """Cluster addresses based on their behavior patterns"""
        save_to_txt("👥 Clustering address behavior...")
        
        address_stats = {}
        
        for transfer in self.transfers:
            sender = transfer['from']['address_hash']
            receiver = transfer['to']['address_hash']
            amount = float(transfer['amount'])
            
            # Update sender stats
            if sender not in address_stats:
                address_stats[sender] = {'sent': 0.0, 'received': 0.0, 'count_sent': 0, 'count_received': 0}
            address_stats[sender]['sent'] += amount
            address_stats[sender]['count_sent'] += 1
            
            # Update receiver stats
            if receiver not in address_stats:
                address_stats[receiver] = {'sent': 0.0, 'received': 0.0, 'count_sent': 0, 'count_received': 0}
            address_stats[receiver]['received'] += amount
            address_stats[receiver]['count_received'] += 1
        
        # Prepare features for clustering
        addresses = list(address_stats.keys())
        features = []
        for addr in addresses:
            stats = address_stats[addr]
            features.append([
                float(stats['sent']),
                float(stats['received']),
                float(stats['count_sent']),
                float(stats['count_received']),
                float(stats['sent'] / max(1, stats['received'])),
                float(stats['received'] / max(1, stats['sent']))
            ])
        
        # Normalize and cluster
        if len(features) > 5:  # Need enough data for clustering
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)
            
            kmeans = KMeans(n_clusters=min(5, len(features)), random_state=42)
            clusters = kmeans.fit_predict(features_scaled)
            
            # Convert numpy arrays to lists for JSON serialization
            clustering_results = {
                'addresses': addresses,
                'clusters': [int(c) for c in clusters],
                'cluster_centers': [[float(x) for x in center] for center in kmeans.cluster_centers_],
                'address_stats': {addr: {k: (float(v) if isinstance(v, (int, float)) else int(v)) 
                                       for k, v in stats.items()} 
                                 for addr, stats in address_stats.items()}
            }
        else:
            clustering_results = {'error': 'Not enough data for clustering'}
        
        self.results['address_clustering'] = clustering_results
        return clustering_results
    
    def calculate_risk_score(self):
        """Calculate overall risk score"""
        risk_score = 0
        
        # Circular trades
        risk_score += len(self.results.get('patterns', {}).get('circular_trades', [])) * 15
        
        # Rapid back-and-forth
        risk_score += len(self.results.get('patterns', {}).get('rapid_back_forth', [])) * 10
        
        # Time anomalies
        risk_score += len(self.results.get('time_anomalies', [])) * 8
        
        # Volume anomalies
        anomalous_buckets = self.results.get('volume_analysis', {}).get('anomalous_buckets', {})
        risk_score += len(anomalous_buckets) * 12
        
        # Network centralization
        network_metrics = self.results.get('network_metrics', {})
        if 'pagerank' in network_metrics:
            pagerank_values = list(network_metrics['pagerank'].values())
            if pagerank_values:
                # Higher score if network is centralized (few addresses have high pagerank)
                top_5_pagerank = sorted(pagerank_values, reverse=True)[:5]
                centralization = sum(top_5_pagerank) / sum(pagerank_values)
                risk_score += int(centralization * 50)
        
        return min(100, risk_score)
    
    def generate_visualizations(self):
        """Create visualizations of detected anomalies"""
        save_to_txt("🎨 Generating visualizations...")
        
        # Volume over time
        timestamps = [pd.to_datetime(t['timestamp']) for t in self.transfers]
        amounts = [float(t['amount']) for t in self.transfers]
        
        plt.figure(figsize=(12, 6))
        plt.scatter(timestamps, amounts, alpha=0.6, s=10)
        plt.title('Transaction Amounts Over Time')
        plt.xlabel('Time')
        plt.ylabel('Amount (log scale)')
        plt.yscale('log')
        plt.grid(True, alpha=0.3)
        plt.savefig('volume_over_time.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Volume distribution
        plt.figure(figsize=(10, 6))
        plt.hist(amounts, bins=50, alpha=0.7, edgecolor='black')
        plt.title('Transaction Amount Distribution')
        plt.xlabel('Amount (log scale)')
        plt.ylabel('Frequency')
        plt.xscale('log')
        plt.grid(True, alpha=0.3)
        plt.savefig('amount_distribution.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Network visualization (if not too large)
        try:
            if 'network_metrics' in self.results and self.results['network_metrics'].get('nodes', 0) < 100:
                G = nx.DiGraph()
                for transfer in self.transfers[:100]:  # Limit for visualization
                    sender = transfer['from']['address_hash'][:8] + '...'
                    receiver = transfer['to']['address_hash'][:8] + '...'
                    G.add_edge(sender, receiver)
                
                plt.figure(figsize=(12, 8))
                pos = nx.spring_layout(G)
                nx.draw(G, pos, with_labels=True, node_size=500, 
                       node_color='lightblue', font_size=8, alpha=0.8)
                plt.title('Transfer Network Graph (First 100 transactions)')
                plt.savefig('network_graph.png', dpi=300, bbox_inches='tight')
                plt.close()
        except:
            pass
    
    def save_to_txt_results(self):
        """save_to_txt comprehensive results"""
        save_to_txt("\n" + "="*80)
        save_to_txt("🤖 POOLING DETECTION RESULTS")
        save_to_txt("="*80)
        
        # Patterns
        patterns = self.results.get('patterns', {})
        save_to_txt(f"\n📈 Transaction Patterns:")
        save_to_txt(f"   Circular trades: {len(patterns.get('circular_trades', []))}")
        save_to_txt(f"   Rapid back-and-forth: {len(patterns.get('rapid_back_forth', []))}")
        save_to_txt(f"   Suspicious address pairs: {len(patterns.get('same_address_pairs', []))}")
        save_to_txt(f"   Clustered amounts: {len(patterns.get('amount_clustering', {}))}")
        
        # Time anomalies
        time_anomalies = self.results.get('time_anomalies', [])
        save_to_txt(f"\n⏰ Time Anomalies: {len(time_anomalies)}")
        
        # Network analysis
        network = self.results.get('network_metrics', {})
        save_to_txt(f"\n🌐 Network Analysis:")
        save_to_txt(f"   Nodes: {network.get('nodes', 0)}")
        save_to_txt(f"   Edges: {network.get('edges', 0)}")
        save_to_txt(f"   Communities: {network.get('communities', 0)}")
        
        # Volume analysis
        volume = self.results.get('volume_analysis', {})
        save_to_txt(f"\n📊 Volume Analysis:")
        save_to_txt(f"   Anomalous periods: {len(volume.get('anomalous_buckets', {}))}")
        
        # Risk score
        risk_score = self.calculate_risk_score()
        save_to_txt(f"\n⚠️  Overall Risk Score: {risk_score}/100")
        
        if risk_score > 70:
            save_to_txt("   🚨 HIGH RISK: Strong evidence of artificial pooling")
        elif risk_score > 40:
            save_to_txt("   ⚠️  MEDIUM RISK: Some suspicious patterns detected")
        else:
            save_to_txt("   ✅ LOW RISK: Normal trading patterns")
        
        save_to_txt(f"\n💾 Visualizations saved: volume_over_time.png, amount_distribution.png")
    
    def run_full_analysis(self):
        """Run complete analysis pipeline"""
        save_to_txt("🚀 Starting comprehensive pooling analysis...")
        
        self.analyze_transaction_patterns()
        self.detect_time_anomalies()
        self.analyze_transfer_network()
        self.analyze_volume_patterns()
        self.cluster_address_behavior()
        self.generate_visualizations()
        self.save_to_txt_results()
        
        return self.results

# Custom JSON encoder to handle all types
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (pd.Timestamp, pd.Timedelta)):
            return str(obj)
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        else:
            return super().default(obj)
        
def save_to_txt(data):
    if not os.path.exists('pooling_analysis.txt'):
        with open('pooling_analysis.txt', 'w') as f:
            f.close()
    with open('pooling_analysis.txt', 'a', encoding='utf-8') as f:
        f.write(f"\n{data}")

# Example usage
def main():
    # Load your transfer data
    with open('token_transfers_0x95597EB8D227a7c4B4f5E807a815C5178eE6dBE1.json', 'r') as f:
        data = json.load(f)
    
    transfers = data.get('transfers', [])
    
    if not transfers:
        save_to_txt("No transfers found in the file!")
        return
    
    save_to_txt(f"📦 Loaded {len(transfers)} transfers for analysis")
    
    # Run analysis
    detector = PoolingDetector(transfers)
    results = detector.run_full_analysis()
    
    # Save detailed results with custom encoder
    with open('pooling_analysis_results.json', 'w') as f:
        json.dump(results, f, indent=2, cls=CustomJSONEncoder)
    
    save_to_txt(f"\n💾 Detailed results saved to pooling_analysis_results.json")

if __name__ == "__main__":
    main()