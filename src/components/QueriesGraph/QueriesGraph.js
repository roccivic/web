import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';

class QueriesGraph extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: {
        labels: [],
        datasets: [
          {
            label: "Total Queries",
            data: [],
            fill: true,
            backgroundColor: "rgba(220,220,220,0.5)",
            borderColor: "rgba(0, 166, 90,.8)",
            pointBorderColor: "rgba(0, 166, 90,.8)",
            pointRadius: 1,
            pointHoverRadius: 5,
            pointHitRadius: 5,
            cubicInterpolationMode: "monotone"
          },
          {
            label: "Blocked Queries",
            data: [],
            fill: true,
            backgroundColor: "rgba(0,192,239,0.5)",
            borderColor: "rgba(0,192,239,1)",
            pointBorderColor: "rgba(0,192,239,1)",
            pointRadius: 1,
            pointHoverRadius: 5,
            pointHitRadius: 5,
            cubicInterpolationMode: "monotone"
          }
        ]
      },
      options: {
        tooltips: {
          enabled: true,
          mode: "x-axis",
          callbacks: {
            title: (tooltipItem, data) => {
              let padNumber = (num) => {
                return ("00" + num).substr(-2,2);
              };

              let time = tooltipItem[0].xLabel.match(/(\d?\d):?(\d?\d?)/);
              let h = parseInt(time[1], 10);
              let m = parseInt(time[2], 10) || 0;
              let from = padNumber(h) + ":" + padNumber(m) + ":00";
              let to = padNumber(h) + ":" + padNumber(m + 9) + ":59";

              return "Queries from " + from + " to " + to;
            },
            label: (tooltipItems, data) => {
              if (tooltipItems.datasetIndex === 1) {
                let percentage = 0.0;
                let total = parseInt(data.datasets[0].data[tooltipItems.index], 10);
                let blocked = parseInt(data.datasets[1].data[tooltipItems.index], 10);

                if (total > 0)
                  percentage = 100.0 * blocked / total;

                return data.datasets[tooltipItems.datasetIndex].label + ": " + tooltipItems.yLabel
                  + " (" + percentage.toFixed(1) + "%)";
              }
              else
                return data.datasets[tooltipItems.datasetIndex].label + ": " + tooltipItems.yLabel;
            }
          }
        },
        legend: {
          display: false
        },
        scales: {
          xAxes: [{
            type: "time",
            time: {
              unit: "hour",
              displayFormats: {
                hour: "HH:mm"
              },
              tooltipFormat: "HH:mm"
            }
          }],
          yAxes: [{
            ticks: {
              beginAtZero: true
            }
          }]
        },
        maintainAspectRatio: false
      }
    };

    this.updateGraph = this.updateGraph.bind(this);
  }

  parseObjectForGraph(p){
    let keys = Object.keys(p);
    keys.sort(function(a, b) {
      return a - b;
    });

    let arr = [], idx = [];
    for(let i = 0; i < keys.length; i++) {
      arr.push(p[keys[i]]);
      idx.push(keys[i]);
    }

    return [idx,arr];
  }

  updateGraph() {
    fetch("http://pi.hole:4747/stats/overTime/graphs")
      .then(res => res.json())
      .then(res => {
        res.ads_over_time = this.parseObjectForGraph(res.ads_over_time);
        res.domains_over_time = this.parseObjectForGraph(res.domains_over_time);

        // Set data
        let totalQueries = [];
        let blockedQueries = [];
        let labels = [];

        // Remove last data point as it's not yet finished
        res.ads_over_time[0].splice(-1, 1);
        res.domains_over_time[0].splice(-1, 1);

        // Generate labels
        for(let i in res.ads_over_time[0]) {
          labels.push(new Date(1000 * res.ads_over_time[0][i]));
          totalQueries.push(res.domains_over_time[1][i]);
          blockedQueries.push(res.ads_over_time[1][i]);
        }

        let data = this.state.data;
        data.labels = labels;
        data.datasets[0].data = totalQueries;
        data.datasets[1].data = blockedQueries;

        this.setState({
          data: data
        });
      })
      .catch(() => null);

    setTimeout(this.updateGraph, 10 * 60 * 1000);
  }

  componentDidMount() {
    this.updateGraph();
  }

  render() {
    return (
      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              Queries over time
            </div>
            <div className="card-block">
              <Line width={970} height={250} data={this.state.data} options={this.state.options}/>
            </div>
            {
              this.state.data.datasets[0].data.length === 0 && this.state.data.datasets[1].data.length === 0
              ?
                <div className="card-img-overlay" style={{background: "rgba(255,255,255,0.7)"}}>
                  <i className="fa fa-refresh fa-spin" style={{position: "absolute", top: "50%", left: "50%", fontSize: "30px"}}/>
                </div>
              :
                null
            }
          </div>
        </div>
      </div>
    );
  }
}

export default QueriesGraph;