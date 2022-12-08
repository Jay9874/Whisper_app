exports.getDateStr = function(){
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const dateString = `${months[d.getMonth()]}, ${d.getDate()}`;
    return dateString;
}