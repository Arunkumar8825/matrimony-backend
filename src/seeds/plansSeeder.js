const mongoose = require('mongoose');
const { SUBSCRIPTION_PLANS } = require('../config/constants');

// This file demonstrates how to use subscription plans
// In a real application, you might store plans in database

async function displayPlans() {
  try {
    console.log('📋 Subscription Plans Available:\n');
    
    Object.entries(SUBSCRIPTION_PLANS).forEach(([planName, plan]) => {
      console.log(`🎯 ${plan.name} Plan:`);
      console.log(`   Duration: ${plan.duration} month(s)`);
      console.log(`   Price: ₹${plan.price}`);
      console.log(`   Features:`);
      plan.features.forEach(feature => {
        console.log(`     ✅ ${feature}`);
      });
      console.log(''); // Empty line
    });

    console.log('\n💡 How to use:');
    console.log('1. Users can select any plan during payment');
    console.log('2. Plan features determine user permissions');
    console.log('3. Plans auto-expire after duration');
    console.log('4. Users can upgrade/downgrade anytime');
    
  } catch (error) {
    console.error('Error displaying plans:', error);
  }
}

// Example of creating a subscription plan dynamically
function createCustomPlan(name, duration, price, features) {
  return {
    name,
    duration,
    price,
    features
  };
}

// Example usage
const customPlan = createCustomPlan(
  'Diamond',
  6,
  4999,
  [
    'All Platinum features',
    'Priority profile verification',
    'Personal matchmaking consultant',
    'Wedding planner consultation'
  ]
);

console.log('\n💎 Custom Plan Example:');
console.log(JSON.stringify(customPlan, null, 2));

// Run if called directly
if (require.main === module) {
  displayPlans();
}

module.exports = {
  displayPlans,
  createCustomPlan,
  SUBSCRIPTION_PLANS
};