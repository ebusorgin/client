const {Neuron} = require("synaptic");
const config = [
  {}
]
class Network {
  METHOD = methods
  constructor(input,output) {
    for (let i = 0; i < this.METHOD.length; i++) {

    }
    for (let i = 0; i < input.length; i++) {

    }
  }
}
const methods = [
  {
    f:()=>{
      console.log('остановиться')
    },
    n:new Neuron()
  },
  {
    f:()=>{
      console.log('двигаться')
    },
    n:new Neuron()
  },
  {
    f:()=>{
      console.log('вверх')
    },
    n:new Neuron()
  },
  {
    f:()=>{
      console.log('вниз')
    },
    n:new Neuron()
  },
  {
    f:()=>{
      console.log('вправо')
    },
    n:new Neuron()
  },
  {
    f:()=>{
      console.log('влево')
    },
    n:new Neuron()
  }
]

const n = Network()

n.work()

