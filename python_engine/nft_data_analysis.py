import os
import json
import asyncio
import aiofiles
import numpy as np
import pandas as pd
import networkx as nx
from typing import List, Dict, Any, Union, Optional
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from collections import defaultdict
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import LocalOutlierFactor
import community as community_louvain
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Custom JSON encoder to handle pandas Timestamp and other non-serializable objects
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (pd.Timestamp, pd.DatetimeIndex)):
            return str(obj)
        elif isinstance(obj, (np.integer, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        else:
            return super().default(obj)

class NFTMovementTracker:
    def __init__(self, transfers: List[Dict], contract_address: str, token_id: str):
        self.transfers = transfers
        self.contract_address = contract_address
        self.token_id = token_id
        self.nft_metadata = {}
        self.movement_chain = []
        self.results = {}
        
        # Create analysis directory structure
        self.analysis_dir = Path("nft_data_analysis") / f"{contract_address}_{token_id}"
        self.analysis_dir.mkdir(parents=True, exist_ok=True)
        
        # Set up file paths
        self.movement_file = self.analysis_dir / "nft_movement_chain.json"
        self.analysis_file = self.analysis_dir / "behavior_analysis.json"
        self.images_dir = self.analysis_dir / "images"
        self.images_dir.mkdir(exist_ok=True)
    
    def extract_metadata(self) -> Dict:
        """Extract and preprocess NFT metadata from transfers"""
        if not self.transfers:
            return {}
        
        # Get metadata from first transfer (should be consistent)
        first_transfer = self.transfers[0]
        token_instance = first_transfer.get('token_instance', {})
        
        # Parse JSON metadata if it exists
        raw_metadata = token_instance.get('token_metadata', '{}')
        try:
            parsed_metadata = json.loads(raw_metadata)
        except json.JSONDecodeError:
            parsed_metadata = {"raw_metadata": raw_metadata}
        
        self.nft_metadata = {
            "token_symbol": token_instance.get('token_symbol', ''),
            "token_name": token_instance.get('token_name', ''),
            "parsed_metadata": parsed_metadata,
            "contract_address": self.contract_address,
            "token_id": self.token_id
        }
        
        return self.nft_metadata
    
    def build_movement_chain(self) -> List[Dict]:
        """Build the complete movement chain from mint to current owner"""
        if not self.transfers:
            return []
        
        # Sort transfers by timestamp (oldest first)
        sorted_transfers = sorted(self.transfers, key=lambda x: x['timestamp'])
        
        # Find the mint transaction (from zero address)
        mint_transfer = None
        for transfer in sorted_transfers:
            if transfer['from']['address_hash'] == '0x0000000000000000000000000000000000000000':
                mint_transfer = transfer
                break
        
        if not mint_transfer:
            print("No mint transaction found (from zero address)")
            return []
        
        # Build the chain starting from mint
        movement_chain = [mint_transfer]
        current_owner = mint_transfer['to']['address_hash']
        
        # Follow the ownership trail
        while True:
            next_transfer = None
            for transfer in sorted_transfers:
                if (transfer['from']['address_hash'] == current_owner and 
                    transfer not in movement_chain):
                    next_transfer = transfer
                    break
            
            if not next_transfer:
                break
            
            movement_chain.append(next_transfer)
            current_owner = next_transfer['to']['address_hash']
        
        self.movement_chain = movement_chain
        return movement_chain
    
    def calculate_time_differences(self) -> List[Dict]:
        """Calculate time differences between consecutive transfers"""
        time_diffs = []
        
        for i in range(1, len(self.movement_chain)):
            current_ts = pd.to_datetime(self.movement_chain[i]['timestamp'])
            previous_ts = pd.to_datetime(self.movement_chain[i-1]['timestamp'])
            
            time_diff = current_ts - previous_ts
            time_diffs.append({
                'from_transfer': i-1,
                'to_transfer': i,
                'time_diff_seconds': time_diff.total_seconds(),
                'time_diff_hours': time_diff.total_seconds() / 3600,
                'time_diff_days': time_diff.total_seconds() / 86400,
                'from_address': self.movement_chain[i-1]['to']['address_hash'],
                'to_address': self.movement_chain[i]['to']['address_hash'],
                'timestamp_current': str(current_ts),
                'timestamp_previous': str(previous_ts)
            })
        
        return time_diffs
    
    def detect_rapid_transfers(self, time_diffs: List[Dict], threshold_hours: float = 24.0) -> List[Dict]:
        """Detect rapid transfers (suspicious behavior)"""
        rapid_transfers = []
        
        for diff in time_diffs:
            if diff['time_diff_hours'] < threshold_hours:
                rapid_transfers.append({
                    **diff,
                    'suspicion_level': 'HIGH' if diff['time_diff_hours'] < 1.0 else 'MEDIUM',
                    'reason': f"Transfer occurred within {diff['time_diff_hours']:.2f} hours"
                })
        
        return rapid_transfers
    
    def detect_cyclic_trades(self) -> Dict:
        """Detect cyclic trading patterns"""
        cycles = {
            'two_node_cycles': [],
            'three_node_cycles': [],
            'complex_cycles': []
        }
        
        # Build directed graph of transfers
        G = nx.DiGraph()
        address_sequence = []
        
        for transfer in self.movement_chain:
            from_addr = transfer['from']['address_hash']
            to_addr = transfer['to']['address_hash']
            G.add_edge(from_addr, to_addr, 
                      timestamp=transfer['timestamp'],
                      tx_hash=transfer['tx_hash'])
            address_sequence.append((from_addr, to_addr))
        
        # Check for immediate back-and-forth (A->B->A)
        for i in range(len(address_sequence) - 1):
            from1, to1 = address_sequence[i]
            from2, to2 = address_sequence[i + 1]
            
            if to1 == from2 and to2 == from1:
                cycles['two_node_cycles'].append({
                    'cycle': [from1, to1, from1],
                    'transactions': [self.movement_chain[i]['tx_hash'], 
                                   self.movement_chain[i+1]['tx_hash']],
                    'time_between': self.calculate_time_differences()[i]['time_diff_hours']
                })
        
        # Check for longer cycles using network analysis
        try:
            all_cycles = list(nx.simple_cycles(G))
            for cycle in all_cycles:
                if len(cycle) == 3:
                    cycles['three_node_cycles'].append({
                        'cycle': cycle,
                        'length': 3
                    })
                elif len(cycle) > 3:
                    cycles['complex_cycles'].append({
                        'cycle': cycle,
                        'length': len(cycle)
                    })
        except nx.NetworkXNoCycle:
            pass
        
        return cycles
    
    def analyze_ownership_patterns(self) -> Dict:
        """Analyze ownership duration and patterns"""
        ownership_stats = {}
        
        for i, transfer in enumerate(self.movement_chain):
            owner = transfer['to']['address_hash']
            timestamp = pd.to_datetime(transfer['timestamp'])
            
            if owner not in ownership_stats:
                ownership_stats[owner] = {
                    'ownership_count': 0,
                    'total_duration_hours': 0.0,
                    'transactions': [],
                    'first_acquired': str(timestamp),  # Convert to string for JSON
                    'last_transferred': str(timestamp)  # Convert to string for JSON
                }
            
            ownership_stats[owner]['ownership_count'] += 1
            ownership_stats[owner]['transactions'].append(transfer['tx_hash'])
            ownership_stats[owner]['last_transferred'] = str(timestamp)
        
        # Calculate ownership duration for each owner
        for owner, stats in ownership_stats.items():
            if stats['ownership_count'] > 1:
                first_acquired = pd.to_datetime(stats['first_acquired'])
                last_transferred = pd.to_datetime(stats['last_transferred'])
                duration = (last_transferred - first_acquired).total_seconds() / 3600
                stats['total_duration_hours'] = duration
                stats['avg_duration_hours'] = duration / stats['ownership_count']
        
        return ownership_stats
    
    def detect_anomalous_behavior(self) -> Dict:
        """Comprehensive anomalous behavior detection"""
        time_diffs = self.calculate_time_differences()
        rapid_transfers = self.detect_rapid_transfers(time_diffs)
        cyclic_trades = self.detect_cyclic_trades()
        ownership_patterns = self.analyze_ownership_patterns()
        
        # Statistical analysis of time differences
        time_diff_hours = [td['time_diff_hours'] for td in time_diffs]
        
        if time_diff_hours:
            time_stats = {
                'mean_hours': float(np.mean(time_diff_hours)),
                'median_hours': float(np.median(time_diff_hours)),
                'std_hours': float(np.std(time_diff_hours)),
                'min_hours': float(np.min(time_diff_hours)),
                'max_hours': float(np.max(time_diff_hours)),
                'q1_hours': float(np.percentile(time_diff_hours, 25)),
                'q3_hours': float(np.percentile(time_diff_hours, 75))
            }
            
            # Detect outliers using IQR
            iqr = time_stats['q3_hours'] - time_stats['q1_hours']
            lower_bound = time_stats['q1_hours'] - 1.5 * iqr
            upper_bound = time_stats['q3_hours'] + 1.5 * iqr
            
            time_outliers = []
            for td in time_diffs:
                if td['time_diff_hours'] < lower_bound or td['time_diff_hours'] > upper_bound:
                    time_outliers.append(td)
        else:
            time_stats = {}
            time_outliers = []
        
        # Address behavior clustering
        address_features = []
        address_labels = []
        
        for owner, stats in ownership_patterns.items():
            features = [
                stats['ownership_count'],
                stats['total_duration_hours'],
                len(stats['transactions'])
            ]
            address_features.append(features)
            address_labels.append(owner)
        
        if len(address_features) > 2:
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(address_features)
            
            # Use DBSCAN for anomaly detection
            dbscan = DBSCAN(eps=1.0, min_samples=2)
            clusters = dbscan.fit_predict(features_scaled)
            
            anomalous_addresses = []
            for i, cluster in enumerate(clusters):
                if cluster == -1:  # Outlier
                    anomalous_addresses.append({
                        'address': address_labels[i],
                        'features': address_features[i],
                        'reason': 'Behavioral outlier based on ownership patterns'
                    })
        else:
            anomalous_addresses = []
        
        return {
            'time_statistics': time_stats,
            'time_outliers': time_outliers,
            'rapid_transfers': rapid_transfers,
            'cyclic_trades': cyclic_trades,
            'ownership_patterns': ownership_patterns,
            'anomalous_addresses': anomalous_addresses,
            'total_transfers': len(self.movement_chain),
            'unique_owners': len(ownership_patterns)
        }
    
    def generate_visualizations(self):
        """Generate visualizations for the NFT movement analysis"""
        if not self.movement_chain:
            return
        
        # Timeline visualization
        timestamps = [pd.to_datetime(t['timestamp']) for t in self.movement_chain]
        owners = [t['to']['address_hash'][:8] + '...' for t in self.movement_chain]
        
        plt.figure(figsize=(14, 8))
        plt.plot(timestamps, range(len(timestamps)), 'o-', markersize=8)
        
        for i, (ts, owner) in enumerate(zip(timestamps, owners)):
            plt.annotate(owner, (ts, i), xytext=(5, 5), textcoords='offset points',
                        fontsize=8, alpha=0.7)
        
        plt.title(f'NFT Ownership Timeline - {self.contract_address} #{self.token_id}')
        plt.xlabel('Time')
        plt.ylabel('Transfer Sequence')
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(self.images_dir / 'ownership_timeline.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Time difference distribution
        time_diffs = self.calculate_time_differences()
        if time_diffs:
            time_diff_hours = [td['time_diff_hours'] for td in time_diffs]
            
            plt.figure(figsize=(12, 6))
            plt.hist(time_diff_hours, bins=20, alpha=0.7, edgecolor='black')
            plt.axvline(np.mean(time_diff_hours), color='red', linestyle='--', 
                       label=f'Mean: {np.mean(time_diff_hours):.2f} hours')
            plt.title('Time Between Consecutive Transfers')
            plt.xlabel('Hours Between Transfers')
            plt.ylabel('Frequency')
            plt.legend()
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig(self.images_dir / 'time_differences.png', dpi=300, bbox_inches='tight')
            plt.close()
        
        # Ownership network graph
        if len(self.movement_chain) > 1:
            G = nx.DiGraph()
            for i in range(len(self.movement_chain)):
                from_addr = self.movement_chain[i]['from']['address_hash'][:8] + '...'
                to_addr = self.movement_chain[i]['to']['address_hash'][:8] + '...'
                G.add_edge(from_addr, to_addr)
            
            plt.figure(figsize=(12, 8))
            pos = nx.spring_layout(G)
            nx.draw(G, pos, with_labels=True, node_size=500, 
                   node_color='lightblue', font_size=8, alpha=0.8,
                   edge_color='gray', width=2, arrowsize=15)
            plt.title('NFT Ownership Transfer Network')
            plt.tight_layout()
            plt.savefig(self.images_dir / 'transfer_network.png', dpi=300, bbox_inches='tight')
            plt.close()
    
    async def save_movement_chain(self):
        """Save the complete movement chain with metadata"""
        movement_data = {
            'nft_metadata': self.nft_metadata,
            'movement_chain': self.movement_chain,
            'total_transfers': len(self.movement_chain),
            'analysis_timestamp': datetime.now().isoformat(),
            'contract_address': self.contract_address,
            'token_id': self.token_id
        }
        
        async with aiofiles.open(self.movement_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(movement_data, indent=2, ensure_ascii=False, cls=CustomJSONEncoder))
    
    async def save_analysis_results(self):
        """Save the behavior analysis results"""
        analysis_results = {
            'nft_metadata': self.nft_metadata,
            'behavior_analysis': self.results,
            'analysis_timestamp': datetime.now().isoformat(),
            'contract_address': self.contract_address,
            'token_id': self.token_id
        }
        
        async with aiofiles.open(self.analysis_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(analysis_results, indent=2, ensure_ascii=False, cls=CustomJSONEncoder))
    
    async def run_complete_analysis(self):
        """Run the complete NFT movement and behavior analysis"""
        print(f"🔍 Starting analysis for NFT: {self.contract_address} #{self.token_id}")
        
        # Extract metadata
        self.extract_metadata()
        print("✅ Metadata extracted")
        
        # Build movement chain
        self.build_movement_chain()
        print(f"✅ Movement chain built with {len(self.movement_chain)} transfers")
        
        # Run behavior analysis
        self.results = self.detect_anomalous_behavior()
        print("✅ Behavior analysis completed")
        
        # Generate visualizations
        self.generate_visualizations()
        print("✅ Visualizations generated")
        
        # Save results
        await self.save_movement_chain()
        await self.save_analysis_results()
        print("✅ Results saved")
        
        # Print summary
        print(f"\n📊 ANALYSIS SUMMARY:")
        print(f"   Total transfers: {len(self.movement_chain)}")
        print(f"   Unique owners: {self.results.get('unique_owners', 0)}")
        print(f"   Rapid transfers: {len(self.results.get('rapid_transfers', []))}")
        print(f"   Cyclic trades: {len(self.results.get('cyclic_trades', {}).get('two_node_cycles', []))} 2-node, "
              f"{len(self.results.get('cyclic_trades', {}).get('three_node_cycles', []))} 3-node")
        print(f"   Anomalous addresses: {len(self.results.get('anomalous_addresses', []))}")
        
        return self.results

async def analyze_nft_movement(contract_address: str, token_id: str):
    """Main function to analyze NFT movement and behavior"""
    try:
        # Load NFT transfer data
        nft_dir = Path("nft_transfer_data")
        json_file = nft_dir / f"nft_transfers_{contract_address}_{token_id}.json"
        
        if not json_file.exists():
            print(f"❌ NFT transfer file not found: {json_file}")
            return None
        
        async with aiofiles.open(json_file, 'r', encoding='utf-8') as f:
            data = json.loads(await f.read())
        
        transfers = data.get('transfers', [])
        
        if not transfers:
            print(f"❌ No transfers found for NFT: {contract_address} #{token_id}")
            return None
        
        print(f"📦 Loaded {len(transfers)} transfers for NFT: {contract_address} #{token_id}")
        
        # Run analysis
        tracker = NFTMovementTracker(transfers, contract_address, token_id)
        results = await tracker.run_complete_analysis()
        
        return results
        
    except Exception as e:
        print(f"❌ Error analyzing NFT {contract_address} #{token_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None