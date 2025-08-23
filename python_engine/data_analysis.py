import os
import json
import asyncio
import aiofiles
import numpy as np
import pandas as pd
import networkx as nx
from typing import List, Dict, Any, Union
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from collections import defaultdict
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import LocalOutlierFactor
import community as community_louvain  # python-louvain package
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

def safe_cast_diameter(value) -> Union[float, str]:
    try:
        # Try converting to float
        f = float(value)
        # Handle invalid float representations (nan, inf, -inf)
        if f == float("inf") or f == float("-inf") or f != f:  
            return str(value)  # keep as string if Infinity/NaN
        return f
    except (ValueError, TypeError):
        # If it's not castable to float, keep as string
        return str(value)

class AsyncPoolingDetector:
    def __init__(self, transfers, token_address):
        self.transfers = transfers
        self.token_address = token_address
        self.results = {}
        
        # Create analysis directory structure
        self.analysis_dir = Path("data_analysis") / f"analysis_{token_address}"
        self.analysis_dir.mkdir(parents=True, exist_ok=True)
        
        # Set up file paths
        self.txt_file = self.analysis_dir / "pooling_analysis.txt"
        self.json_file = self.analysis_dir / "pooling_analysis_results.json"
        self.images_dir = self.analysis_dir / "images"
        self.images_dir.mkdir(exist_ok=True)
    
    async def save_to_txt(self, data):
        """Async save to text file"""
        async with aiofiles.open(self.txt_file, 'a', encoding='utf-8') as f:
            await f.write(f"\n{data}")
    
    async def analyze_transaction_patterns(self):
        """Analyze transaction patterns for wash trading signs"""
        await self.save_to_txt("🔍 Analyzing transaction patterns...")
        
        patterns = {
            'circular_trades': [],
            'circular_trades_by_length': defaultdict(int),
            'rapid_back_forth': [],
            'same_address_pairs': [],
            'amount_clustering': await self.detect_amount_clustering(),
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
            
            # Check for immediate back-and-forth (A->B->A pattern)
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
        circular_trades = await self.detect_circular_trades(transaction_pairs)
        patterns['circular_trades'] = circular_trades
        
        # Count circular trades by length
        for trade in circular_trades:
            length = trade['length']
            patterns['circular_trades_by_length'][length] += 1
        
        # Find address pairs with high frequency trading
        # Justification: Frequent trading between same addresses suggests coordinated behavior
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
    
    async def detect_circular_trades(self, transaction_pairs):
        """Detect circular trading patterns with detailed cycle analysis"""
        circular_trades = []
        G = nx.DiGraph()
        
        for sender, receiver, amount, timestamp, idx in transaction_pairs:
            G.add_edge(sender, receiver, weight=amount, timestamp=timestamp, index=idx)
        
        # Look for cycles of different lengths
        try:
            cycles = list(nx.simple_cycles(G))
            for cycle in cycles:
                if 2 <= len(cycle) <= 6:  # Consider cycles up to length 6
                    # Calculate cycle metrics
                    cycle_amounts = []
                    for i in range(len(cycle)):
                        sender = cycle[i]
                        receiver = cycle[(i + 1) % len(cycle)]
                        if G.has_edge(sender, receiver):
                            cycle_amounts.append(G[sender][receiver]['weight'])
                    
                    circular_trades.append({
                        'cycle': cycle,
                        'length': len(cycle),
                        'total_amount': sum(cycle_amounts) if cycle_amounts else 0,
                        'avg_amount': sum(cycle_amounts) / len(cycle_amounts) if cycle_amounts else 0
                    })
        except Exception as e:
            await self.save_to_txt(f"Cycle detection warning: {e}")
        
        return circular_trades
    
    async def detect_amount_clustering(self):
        """Detect suspicious amount clustering with statistical analysis"""
        amounts = [float(t['amount']) for t in self.transfers]
        
        if not amounts:
            return {}
        
        # Check for repeated identical amounts
        # Justification: Wash trading often uses round numbers or specific amounts
        amount_counts = {}
        for amount in amounts:
            # Round to 6 decimal places to catch nearly identical amounts
            rounded_amount = round(amount, 6)
            amount_counts[rounded_amount] = amount_counts.get(rounded_amount, 0) + 1
        
        # Statistical analysis of amount distribution
        amount_array = np.array(amounts)
        amount_stats = {
            'mean': float(np.mean(amount_array)),
            'std': float(np.std(amount_array)),
            'median': float(np.median(amount_array)),
            'q1': float(np.percentile(amount_array, 25)),
            'q3': float(np.percentile(amount_array, 75))
        }
        
        # Find amounts that occur unusually frequently
        suspicious_amounts = {}
        for amt, cnt in amount_counts.items():
            # More than 5 occurrences and amount is above median (avoid dust transactions)
            if cnt > 5 and amt > amount_stats['median']:
                # Calculate how unusual this frequency is
                frequency_ratio = cnt / len(amounts)
                if frequency_ratio > 0.01:  # More than 1% of all transactions
                    suspicious_amounts[str(amt)] = {
                        'count': int(cnt),
                        'frequency_ratio': float(frequency_ratio)
                    }
        
        return {
            'suspicious_amounts': suspicious_amounts,
            'amount_statistics': amount_stats
        }
    
    async def detect_time_anomalies(self):
        """Detect anomalous timing patterns with multiple algorithms"""
        await self.save_to_txt("⏰ Analyzing time anomalies...")
        
        if not self.transfers:
            return []
        
        timestamps = []
        amounts = []
        
        for transfer in self.transfers:
            ts = pd.to_datetime(transfer['timestamp'])
            timestamps.append(ts.timestamp())
            amounts.append(float(transfer['amount']))
        
        # Justification: Time anomalies detect unusual trading patterns
        # like rapid-fire transactions or coordinated trading windows
        
        # Normalize features for anomaly detection
        timestamps_norm = (np.array(timestamps) - np.min(timestamps)) / max(1, np.max(timestamps) - np.min(timestamps))
        amounts_norm = (np.array(amounts) - np.min(amounts)) / max(1, np.max(amounts) - np.min(amounts))
        
        features = np.column_stack([timestamps_norm, amounts_norm])
        
        # Multiple anomaly detection methods for robustness
        iso_forest = IsolationForest(contamination=0.15, random_state=42)
        lof = LocalOutlierFactor(n_neighbors=min(20, len(features)-1), contamination=0.15)
        
        iso_anomalies = iso_forest.fit_predict(features)
        lof_anomalies = lof.fit_predict(features)
        
        # Combine results - consider anomaly if both algorithms agree
        combined_anomalies = []
        for i, (iso, lof) in enumerate(zip(iso_anomalies, lof_anomalies)):
            if iso == -1 and lof == -1:  # Both algorithms flag as anomaly
                combined_anomalies.append({
                    'index': int(i),
                    'timestamp': str(self.transfers[i]['timestamp']),
                    'amount': float(amounts[i]),
                    'is_iso_anomaly': bool(iso == -1),
                    'is_lof_anomaly': bool(lof == -1),
                    'anomaly_score': float(abs(iso_forest.score_samples([features[i]])[0]))
                })
        
        self.results['time_anomalies'] = combined_anomalies
        return combined_anomalies
    
    async def analyze_transfer_network(self):
        """Build and analyze transfer network graph with advanced metrics"""
        await self.save_to_txt("🌐 Analyzing transfer network...")
        
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
        
        # Calculate comprehensive network metrics
        try:
            # Basic metrics
            degree_centrality = nx.degree_centrality(G)
            betweenness_centrality = nx.betweenness_centrality(G)
            pagerank = nx.pagerank(G, weight='weight')
            
            # Advanced metrics for wash trading detection
            if nx.is_weakly_connected(G):
                diameter = nx.diameter(G)
            else:
                diameter = float('inf')
            
            # Community detection
            undirected_G = G.to_undirected()
            partition = community_louvain.best_partition(undirected_G)
            
            # Calculate centralization metrics (high centralization suggests wash trading)
            pagerank_values = list(pagerank.values())
            centralization_score = np.std(pagerank_values) / np.mean(pagerank_values) if pagerank_values else 0
            
            network_metrics = {
                'nodes': int(G.number_of_nodes()),
                'edges': int(G.number_of_edges()),
                'diameter': safe_cast_diameter(diameter),
                'average_degree': float(sum(dict(G.degree()).values()) / G.number_of_nodes()) if G.number_of_nodes() > 0 else 0,
                'degree_centrality': {k: float(v) for k, v in degree_centrality.items()},
                'betweenness_centrality': {k: float(v) for k, v in betweenness_centrality.items()},
                'pagerank': {k: float(v) for k, v in pagerank.items()},
                'communities': int(len(set(partition.values()))),
                'centralization_score': float(centralization_score),
                'partition': {k: int(v) for k, v in partition.items()}
            }
            
        except Exception as e:
            await self.save_to_txt(f"Network analysis error: {e}")
            network_metrics = {'error': str(e)}
        
        self.results['network_metrics'] = network_metrics
        return network_metrics
    
    async def analyze_volume_patterns(self, time_window_hours=6):
        """Analyze volume patterns over time windows with statistical tests"""
        await self.save_to_txt("📊 Analyzing volume patterns...")
        
        time_buckets = defaultdict(list)
        
        for transfer in self.transfers:
            ts = pd.to_datetime(transfer['timestamp'])
            bucket_key = ts.floor(f'{time_window_hours}H')
            time_buckets[bucket_key].append(float(transfer['amount']))
        
        # Calculate comprehensive statistics per bucket
        bucket_stats = {}
        for bucket, amounts in time_buckets.items():
            if amounts:
                amount_array = np.array(amounts)
                bucket_stats[str(bucket)] = {
                    'total_volume': float(sum(amounts)),
                    'avg_volume': float(np.mean(amount_array)),
                    'median_volume': float(np.median(amount_array)),
                    'max_volume': float(np.max(amount_array)),
                    'min_volume': float(np.min(amount_array)),
                    'transaction_count': int(len(amounts)),
                    'volume_variance': float(np.var(amount_array)),
                    'volume_std': float(np.std(amount_array))
                }
        
        # Detect anomalous buckets using statistical methods
        volumes = [stats['total_volume'] for stats in bucket_stats.values() if stats['total_volume'] > 0]
        anomalous_buckets = {}
        
        if volumes and len(volumes) > 5:  # Need enough data for statistical analysis
            # Use IQR method for robust outlier detection
            Q1 = np.percentile(volumes, 25)
            Q3 = np.percentile(volumes, 75)
            IQR = Q3 - Q1
            upper_bound = Q3 + 2.5 * IQR  # More conservative than 1.5*IQR
            
            for bucket, stats in bucket_stats.items():
                if stats['total_volume'] > upper_bound:
                    anomalous_buckets[bucket] = stats
        
        self.results['volume_analysis'] = {
            'bucket_stats': bucket_stats,
            'anomalous_buckets': anomalous_buckets,
            'total_time_periods': len(bucket_stats)
        }
        
        return bucket_stats, anomalous_buckets
    
    async def cluster_address_behavior(self):
        """Cluster addresses based on their behavior patterns with enhanced features"""
        await self.save_to_txt("👥 Clustering address behavior...")
        
        address_stats = {}
        
        for transfer in self.transfers:
            sender = transfer['from']['address_hash']
            receiver = transfer['to']['address_hash']
            amount = float(transfer['amount'])
            timestamp = pd.to_datetime(transfer['timestamp'])
            
            # Update sender stats
            if sender not in address_stats:
                address_stats[sender] = {
                    'sent': 0.0, 'received': 0.0, 
                    'count_sent': 0, 'count_received': 0,
                    'first_seen': timestamp, 'last_seen': timestamp,
                    'unique_counterparties': set()
                }
            address_stats[sender]['sent'] += amount
            address_stats[sender]['count_sent'] += 1
            address_stats[sender]['last_seen'] = max(address_stats[sender]['last_seen'], timestamp)
            address_stats[sender]['unique_counterparties'].add(receiver)
            
            # Update receiver stats
            if receiver not in address_stats:
                address_stats[receiver] = {
                    'sent': 0.0, 'received': 0.0, 
                    'count_sent': 0, 'count_received': 0,
                    'first_seen': timestamp, 'last_seen': timestamp,
                    'unique_counterparties': set()
                }
            address_stats[receiver]['received'] += amount
            address_stats[receiver]['count_received'] += 1
            address_stats[receiver]['last_seen'] = max(address_stats[receiver]['last_seen'], timestamp)
            address_stats[receiver]['unique_counterparties'].add(sender)
        
        # Prepare enhanced features for clustering
        addresses = list(address_stats.keys())
        features = []
        for addr in addresses:
            stats = address_stats[addr]
            activity_duration = (stats['last_seen'] - stats['first_seen']).total_seconds() / 3600  # hours
            
            features.append([
                float(stats['sent']),
                float(stats['received']),
                float(stats['count_sent']),
                float(stats['count_received']),
                float(stats['sent'] / max(1, stats['received'])),
                float(stats['received'] / max(1, stats['sent'])),
                float(len(stats['unique_counterparties'])),
                float(activity_duration),
                float((stats['count_sent'] + stats['count_received']) / max(1, activity_duration))  # transactions per hour
            ])
        
        # Normalize and cluster
        if len(features) > 10:  # Need enough data for meaningful clustering
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)
            
            # Use optimal number of clusters
            n_clusters = min(8, max(3, len(features) // 10))
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(features_scaled)
            
            # Convert timestamp objects to strings for JSON serialization
            clustering_results = {
                'addresses': addresses,
                'clusters': [int(c) for c in clusters],
                'cluster_centers': [[float(x) for x in center] for center in kmeans.cluster_centers_],
                'address_stats': {
                    addr: {
                        'sent': float(stats['sent']),
                        'received': float(stats['received']),
                        'count_sent': int(stats['count_sent']),
                        'count_received': int(stats['count_received']),
                        'first_seen': str(stats['first_seen']),
                        'last_seen': str(stats['last_seen']),
                        'unique_counterparties_count': int(len(stats['unique_counterparties']))
                    }
                    for addr, stats in address_stats.items()
                }
            }
        else:
            clustering_results = {'error': 'Not enough data for meaningful clustering'}
        
        self.results['address_clustering'] = clustering_results
        return clustering_results
    
    def calculate_risk_score(self):
        """Calculate comprehensive risk score with weighted components"""
        risk_score = 0
        max_score = 100
        
        patterns = self.results.get('patterns', {})
        time_anomalies = self.results.get('time_anomalies', [])
        volume_analysis = self.results.get('volume_analysis', {})
        network_metrics = self.results.get('network_metrics', {})
        
        # 1. Circular trades (25% weight)
        circular_trades = patterns.get('circular_trades', [])
        circular_by_length = patterns.get('circular_trades_by_length', {})
        
        # Weight cycles by length: longer cycles = more suspicious
        circular_score = 0
        for length, count in circular_by_length.items():
            if length == 2:
                circular_score += count * 5  # 2-node cycles: less suspicious
            elif length == 3:
                circular_score += count * 10  # 3-node cycles: moderately suspicious
            else:
                circular_score += count * 15  # 4+ node cycles: highly suspicious
        
        risk_score += min(25, circular_score)
        
        # 2. Rapid back-and-forth trades (15% weight)
        rapid_trades = len(patterns.get('rapid_back_forth', []))
        risk_score += min(15, rapid_trades * 2)
        
        # 3. Time anomalies (20% weight)
        time_anomaly_score = min(20, len(time_anomalies) * 0.5)
        risk_score += time_anomaly_score
        
        # 4. Network centralization (15% weight)
        if 'centralization_score' in network_metrics:
            centralization = network_metrics['centralization_score']
            # Higher centralization = more suspicious
            network_score = min(15, centralization * 30)
            risk_score += network_score
        
        # 5. Volume anomalies (10% weight)
        volume_anomalies = len(volume_analysis.get('anomalous_buckets', {}))
        risk_score += min(10, volume_anomalies * 3)
        
        # 6. Suspicious address pairs (10% weight)
        suspicious_pairs = len(patterns.get('same_address_pairs', []))
        risk_score += min(10, suspicious_pairs * 1)
        
        # 7. Amount clustering (5% weight)
        amount_clustering = len(patterns.get('amount_clustering', {}).get('suspicious_amounts', {}))
        risk_score += min(5, amount_clustering * 2)
        
        return min(max_score, risk_score)
    
    async def generate_visualizations(self):
        """Create comprehensive visualizations of detected anomalies"""
        await self.save_to_txt("🎨 Generating visualizations...")
        
        # Volume over time
        timestamps = [pd.to_datetime(t['timestamp']) for t in self.transfers]
        amounts = [float(t['amount']) for t in self.transfers]
        
        plt.figure(figsize=(14, 7))
        plt.scatter(timestamps, amounts, alpha=0.6, s=15, c='blue')
        plt.title(f'Transaction Amounts Over Time - {self.token_address}')
        plt.xlabel('Time')
        plt.ylabel('Amount (log scale)')
        plt.yscale('log')
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(self.images_dir / 'volume_over_time.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Volume distribution with statistical markers
        plt.figure(figsize=(12, 6))
        n, bins, patches = plt.hist(amounts, bins=50, alpha=0.7, edgecolor='black', log=True)
        plt.title('Transaction Amount Distribution (Log Scale)')
        plt.xlabel('Amount')
        plt.ylabel('Frequency (log scale)')
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(self.images_dir / 'amount_distribution.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Network visualization for reasonable-sized networks
        try:
            if 'network_metrics' in self.results and self.results['network_metrics'].get('nodes', 0) < 150:
                G = nx.DiGraph()
                for transfer in self.transfers[:200]:  # Limit for visualization
                    sender = transfer['from']['address_hash'][:8] + '...'
                    receiver = transfer['to']['address_hash'][:8] + '...'
                    G.add_edge(sender, receiver)
                
                plt.figure(figsize=(16, 12))
                pos = nx.spring_layout(G, k=1, iterations=50)
                nx.draw(G, pos, with_labels=True, node_size=300, 
                       node_color='lightblue', font_size=6, alpha=0.8,
                       edge_color='gray', width=0.5, arrowsize=8)
                plt.title(f'Transfer Network Graph - {self.token_address}')
                plt.tight_layout()
                plt.savefig(self.images_dir / 'network_graph.png', dpi=300, bbox_inches='tight')
                plt.close()
        except Exception as e:
            await self.save_to_txt(f"Network visualization skipped: {e}")
    
    async def save_detailed_results(self):
        """Save comprehensive results with detailed justifications"""
        await self.save_to_txt("\n" + "="*80)
        await self.save_to_txt("🤖 POOLING DETECTION RESULTS")
        await self.save_to_txt("="*80)
        
        patterns = self.results.get('patterns', {})
        time_anomalies = self.results.get('time_anomalies', [])
        network = self.results.get('network_metrics', {})
        volume = self.results.get('volume_analysis', {})
        
        # Detailed pattern analysis
        await self.save_to_txt(f"\n📈 TRANSACTION PATTERN ANALYSIS:")
        await self.save_to_txt(f"   Circular trades detected: {len(patterns.get('circular_trades', []))}")
        
        circular_by_length = patterns.get('circular_trades_by_length', {})
        for length, count in sorted(circular_by_length.items()):
            if length == 2:
                await self.save_to_txt(f"     • 2-node cycles: {count} (Less suspicious - could be simple buy/sell)")
            elif length == 3:
                await self.save_to_txt(f"     • 3-node cycles: {count} (Moderately suspicious - suggests coordination)")
            else:
                await self.save_to_txt(f"     • {length}+-node cycles: {count} (Highly suspicious - complex wash trading)")
        
        await self.save_to_txt(f"   Rapid back-and-forth trades: {len(patterns.get('rapid_back_forth', []))}")
        await self.save_to_txt(f"   Suspicious address pairs: {len(patterns.get('same_address_pairs', []))}")
        await self.save_to_txt(f"   Clustered amounts: {len(patterns.get('amount_clustering', {}).get('suspicious_amounts', {}))}")
        
        # Time anomaly analysis
        await self.save_to_txt(f"\n⏰ TIME ANOMALY ANALYSIS:")
        await self.save_to_txt(f"   Time anomalies detected: {len(time_anomalies)}")
        await self.save_to_txt("   Justification: Anomalies detected when transactions show unusual timing patterns")
        await self.save_to_txt("   that deviate from normal trading behavior, suggesting coordinated activity")
        
        # Network analysis
        await self.save_to_txt(f"\n🌐 NETWORK ANALYSIS:")
        await self.save_to_txt(f"   Nodes: {network.get('nodes', 0)}")
        await self.save_to_txt(f"   Edges: {network.get('edges', 0)}")
        await self.save_to_txt(f"   Communities: {network.get('communities', 0)}")
        await self.save_to_txt(f"   Network centralization: {network.get('centralization_score', 0):.3f}")
        await self.save_to_txt("   Justification: High centralization suggests few addresses control most flow")
        
        # Volume analysis
        await self.save_to_txt(f"\n📊 VOLUME ANALYSIS:")
        await self.save_to_txt(f"   Anomalous time periods: {len(volume.get('anomalous_buckets', {}))}")
        await self.save_to_txt(f"   Total time periods analyzed: {volume.get('total_time_periods', 0)}")
        await self.save_to_txt("   Justification: Volume spikes indicate coordinated trading activity")
        
        # Risk assessment
        risk_score = self.calculate_risk_score()
        await self.save_to_txt(f"\n⚠️  RISK ASSESSMENT:")
        await self.save_to_txt(f"   Overall Risk Score: {risk_score}/100")
        
        if risk_score > 75:
            await self.save_to_txt("   🚨 HIGH RISK: Strong evidence of artificial pooling/wash trading")
            await self.save_to_txt("   Multiple suspicious patterns detected across different analysis dimensions")
        elif risk_score > 50:
            await self.save_to_txt("   ⚠️  MEDIUM RISK: Several suspicious patterns detected")
            await self.save_to_txt("   Potential wash trading activity requiring further investigation")
        elif risk_score > 25:
            await self.save_to_txt("   📋 LOW-MEDIUM RISK: Some unusual patterns detected")
            await self.save_to_txt("   May represent normal market activity with some anomalies")
        else:
            await self.save_to_txt("   ✅ LOW RISK: Normal trading patterns detected")
            await self.save_to_txt("   No significant evidence of artificial pooling")
        
        await self.save_to_txt(f"\n💾 Results saved in: {self.analysis_dir}")
        await self.save_to_txt(f"📊 Visualizations: {self.images_dir}")
    
    async def save_json_results(self):
        """Save detailed results to JSON file"""
        async with aiofiles.open(self.json_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(self.results, indent=2, cls=CustomJSONEncoder, ensure_ascii=False))
    
    async def run_full_analysis(self):
        """Run complete analysis pipeline with progress tracking"""
        await self.save_to_txt("🚀 Starting comprehensive pooling analysis...")
        await self.save_to_txt(f"📊 Analyzing {len(self.transfers)} transfers for token: {self.token_address}")
        
        # Clear previous results file
        async with aiofiles.open(self.txt_file, 'w', encoding='utf-8') as f:
            await f.write(f"Pooling Analysis for Token: {self.token_address}\n")
            await f.write(f"Analysis started: {datetime.now().isoformat()}\n")
            await f.write("="*60 + "\n")
        
        # Run analysis steps
        analysis_tasks = [
            self.analyze_transaction_patterns(),
            self.detect_time_anomalies(),
            self.analyze_transfer_network(),
            self.analyze_volume_patterns(),
            self.cluster_address_behavior()
        ]
        
        await asyncio.gather(*analysis_tasks)
        
        await self.generate_visualizations()
        await self.save_detailed_results()
        await self.save_json_results()
        
        await self.save_to_txt(f"\n✅ Analysis completed: {datetime.now().isoformat()}")
        await self.save_to_txt(f"📁 Complete results saved in: {self.analysis_dir}")
        
        return self.results

# Custom JSON encoder
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

async def analyze_token_pooling(token_address: str):
    """Async function to analyze pooling for a single token with enhanced error handling"""
    try:
        # Load transfer data
        transfer_file = Path("transfer_data") / f"token_transfers_{token_address}.json"
        
        if not transfer_file.exists():
            print(f"❌ Transfer file not found for token: {token_address}")
            return None
        
        async with aiofiles.open(transfer_file, 'r', encoding='utf-8') as f:
            data = json.loads(await f.read())
        
        transfers = data.get('transfers', [])
        
        if not transfers:
            print(f"❌ No transfers found for token: {token_address}")
            return None
        
        print(f"📦 Loaded {len(transfers)} transfers for token: {token_address}")
        
        # Run comprehensive analysis
        detector = AsyncPoolingDetector(transfers, token_address)
        results = await detector.run_full_analysis()
        
        risk_score = detector.calculate_risk_score()
        print(f"✅ Analysis complete for {token_address} - Risk Score: {risk_score}/100")
        
        return results
        
    except Exception as e:
        print(f"❌ Error analyzing token {token_address}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None